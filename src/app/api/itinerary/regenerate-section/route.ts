import { generateJson } from "@/lib/gemini";
import { AiSectionSchema } from "@/lib/itinerary-ai";
import { buildItineraryPrompt } from "@/lib/prompts";
import type { Itinerary } from "@/types/itinerary";
import type { SensoryProfile } from "@/types/sensory-profile";
import type { VenueData } from "@/types/venue";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  itinerary: z.object({
    id: z.string().uuid(),
    venueData: z.record(z.unknown()),
    sensoryProfile: z.record(z.unknown()),
    visitDate: z.string().optional(),
    fromSuburb: z.string().optional(),
    sections: z.array(z.record(z.unknown())),
  }).passthrough(),
  sectionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itinerary, sectionId } = RequestSchema.parse(body);

    const typedItinerary = itinerary as unknown as Itinerary;
    const venue = typedItinerary.venueData as VenueData;
    const profile = typedItinerary.sensoryProfile as SensoryProfile;
    const currentSection = typedItinerary.sections.find((section) => section.id === sectionId);

    if (!currentSection) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const systemPrompt = `${buildItineraryPrompt(profile)}

You are now regenerating ONLY ONE itinerary section.
Return exactly one JSON object with keys: id, title, emoji, content, details, isExpandable.
Keep the same id and title unless a tiny wording improvement is clearly better.
Do not return the full itinerary.`.trim();

    const siblingSummary = typedItinerary.sections
      .filter((section) => section.id !== sectionId)
      .map((section) => ({ id: section.id, title: section.title, content: section.content }))
      .slice(0, 7);

    const userPrompt = `
Regenerate the following Pathwise itinerary section so it is clearer, more actionable, and tailored to the visitor.

SECTION TO REGENERATE:
${JSON.stringify(currentSection, null, 2)}

VENUE:
${JSON.stringify(venue, null, 2)}

VISIT DATE: ${typedItinerary.visitDate ?? "not specified"}
FROM SUBURB: ${typedItinerary.fromSuburb ?? "not specified"}

OTHER ITINERARY SECTIONS (for context, avoid duplication):
${JSON.stringify(siblingSummary, null, 2)}

Requirements:
- Keep the same section id: ${sectionId}
- Write in second person with calm, plain language
- Include specific, useful details, not generic filler
- Prefer short bullets in details for practical steps
- Keep it supportive and non-judgmental

Return ONLY the section JSON object.
`.trim();

    const raw = await generateJson(systemPrompt, userPrompt) as Record<string, unknown>;
    const candidate = (raw.section ?? raw) as Record<string, unknown>;
    const parsed = AiSectionSchema.safeParse({
      ...candidate,
      id: sectionId,
      title: typeof candidate.title === "string" && candidate.title.length > 0 ? candidate.title : currentSection.title,
    });

    if (!parsed.success) {
      console.warn("[/api/itinerary/regenerate-section] validation fallback", parsed.error.flatten());
      return NextResponse.json({ section: currentSection });
    }

    return NextResponse.json({ section: parsed.data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    console.error("[/api/itinerary/regenerate-section]", err);
    return NextResponse.json(
      { error: "Failed to regenerate section." },
      { status: 500 }
    );
  }
}
