import { crawlVenueSite, scrapeVenueUrl } from "@/lib/firecrawl";
import { AI_MODEL, getOpenAI } from "@/lib/openai";
import { VENUE_EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = RequestSchema.parse(body);

    // 1. Crawl the venue site (up to 5 pages: main, visit, accessibility, café, contact)
    let pages;
    try {
      pages = await crawlVenueSite(url, 5);
    } catch {
      // Fall back to single-page scrape if crawl fails
      const single = await scrapeVenueUrl(url);
      pages = [single];
    }

    // 2. Combine all page content
    const combinedContent = pages
      .map((p) => `## Page: ${p.metadata.sourceURL ?? url}\n\n${p.markdown}`)
      .join("\n\n---\n\n")
      .slice(0, 60000); // stay within token limits

    // 3. Extract structured venue data with Gemini
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: VENUE_EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract structured venue data from the following website content.\n\nWebsite URL: ${url}\n\nContent:\n${combinedContent}`,
        },
      ],
    });

    const rawJson = completion.choices[0]?.message?.content ?? "{}";
    let venueData: unknown;
    try {
      venueData = JSON.parse(rawJson);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse venue data from AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ venueData });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[/api/scrape]", err);
    return NextResponse.json(
      { error: "Failed to scrape venue. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
