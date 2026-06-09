import { normalizeCollaborators } from "@/lib/collaboration";
import { createClient } from "@/lib/supabase/server";
import type { Itinerary } from "@/types/itinerary";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SaveGuideSchema = z.object({
  itinerary: z.object({
    id: z.string().uuid(),
    visitDate: z.string().optional(),
    fromSuburb: z.string().optional(),
    riskScore: z.number().optional(),
    venueData: z.object({
      name: z.string(),
      url: z.string(),
      address: z.string().optional(),
      suburb: z.string().optional(),
      overallSensoryRating: z.string().optional(),
    }),
  }).passthrough(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("itineraries")
      .select("id, venue_name, venue_suburb, visit_date, risk_score, created_at, is_public")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ guides: data ?? [] });
  } catch (err) {
    console.error("[/api/guides GET]", err);
    return NextResponse.json(
      { error: "Failed to load saved guides." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { itinerary } = SaveGuideSchema.parse(body);
    const itineraryData = itinerary as unknown as Itinerary;
    const normalizedCollaborators = normalizeCollaborators(itineraryData);
    const nowIso = new Date().toISOString();
    const normalizedItinerary: Itinerary = {
      ...itineraryData,
      sharedWith: normalizedCollaborators,
      sharedWithEmails: normalizedCollaborators.map((item) => item.email),
      lastEditedAt: nowIso,
      lastEditedByEmail: user.email?.toLowerCase(),
    };

    const { error } = await supabase.from("itineraries").upsert(
      {
        id: normalizedItinerary.id,
        user_id: user.id,
        venue_name: normalizedItinerary.venueData.name,
        venue_url: normalizedItinerary.venueData.url,
        venue_address: normalizedItinerary.venueData.address,
        venue_suburb: normalizedItinerary.venueData.suburb,
        visit_date: normalizedItinerary.visitDate,
        from_suburb: normalizedItinerary.fromSuburb,
        itinerary_json: normalizedItinerary,
        risk_score: normalizedItinerary.riskScore,
        overall_sensory_rating: normalizedItinerary.venueData.overallSensoryRating,
        shared_with_emails: normalizedItinerary.sharedWithEmails ?? [],
      },
      { onConflict: "id" }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    console.error("[/api/guides POST]", err);
    return NextResponse.json(
      { error: "Failed to save guide." },
      { status: 500 }
    );
  }
}
