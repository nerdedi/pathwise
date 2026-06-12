import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  venueUrl: z.string().url(),
});

function isMissingLiveStateInfra(error: unknown) {
  const code = (error as { code?: string } | undefined)?.code;
  const message = String((error as { message?: string } | undefined)?.message ?? "").toLowerCase();

  return code === "42P01" || code === "42703" || message.includes("venue_live_state");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.parse({ venueUrl: searchParams.get("venueUrl") });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("venue_live_state")
      .select(
        "venue_url, venue_name, busyness_level, open_status, next_change_at, weather_condition, temperature_c, weather_recommendation, source, confidence, special_closure_note, updated_at"
      )
      .eq("venue_url", parsed.venueUrl)
      .maybeSingle();

    if (error) {
      if (isMissingLiveStateInfra(error)) {
        return NextResponse.json({ liveState: null, unavailable: true });
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json({ liveState: null });
    }

    return NextResponse.json({
      liveState: {
        venueUrl: data.venue_url,
        venueName: data.venue_name,
        busynessLevel: data.busyness_level,
        openStatus: data.open_status,
        nextChangeAt: data.next_change_at,
        weatherCondition: data.weather_condition,
        temperatureC: data.temperature_c,
        weatherRecommendation: data.weather_recommendation,
        source: data.source,
        confidence: data.confidence,
        specialClosureNote: data.special_closure_note,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    logError("/api/live-state GET", err);
    return NextResponse.json(
      { error: "Failed to load live venue status." },
      { status: 500 }
    );
  }
}
