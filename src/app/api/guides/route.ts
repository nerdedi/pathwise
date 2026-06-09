import { createClient } from "@/lib/supabase/server";
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

    const { error } = await supabase.from("itineraries").upsert(
      {
        id: itinerary.id,
        user_id: user.id,
        venue_name: itinerary.venueData.name,
        venue_url: itinerary.venueData.url,
        venue_address: itinerary.venueData.address,
        venue_suburb: itinerary.venueData.suburb,
        visit_date: itinerary.visitDate,
        from_suburb: itinerary.fromSuburb,
        itinerary_json: itinerary,
        risk_score: itinerary.riskScore,
        overall_sensory_rating: itinerary.venueData.overallSensoryRating,
        shared_with_emails: itinerary.sharedWithEmails ?? [],
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
