import { sanitizeItineraryForAccess } from "@/lib/collaboration";
import { createClient } from "@/lib/supabase/server";
import type { Itinerary } from "@/types/itinerary";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("itineraries")
      .select("itinerary_json, is_public")
      .eq("id", params.id)
      .eq("is_public", true)
      .maybeSingle();

    if (error) throw error;

    if (!data?.itinerary_json) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    const publicItinerary = sanitizeItineraryForAccess(data.itinerary_json as Itinerary, false);

    return NextResponse.json({ itinerary: publicItinerary });
  } catch (err) {
    console.error("[/api/public-guides/:id GET]", err);
    return NextResponse.json(
      { error: "Failed to load public guide." },
      { status: 500 }
    );
  }
}
