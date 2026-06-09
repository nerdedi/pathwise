import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  venueUrl: z.string().url(),
});

const PostSchema = z.object({
  venueUrl: z.string().url(),
  venueName: z.string().min(1),
  venueSuburb: z.string().optional(),
  overallRating: z.number().min(1).max(10),
  notes: z.string().optional(),
  tips: z.string().optional(),
  visitDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.parse({ venueUrl: searchParams.get("venueUrl") });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("venue_community_data")
      .select("id, overall_rating, notes, tips, visit_date, helpful_count, created_at")
      .eq("venue_url", parsed.venueUrl)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ entries: data ?? [] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    logError("/api/community GET", err);
    return NextResponse.json(
      { error: "Failed to load community notes." },
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
    const payload = PostSchema.parse(body);

    const { error } = await supabase.from("venue_community_data").insert({
      user_id: user.id,
      venue_url: payload.venueUrl,
      venue_name: payload.venueName,
      venue_suburb: payload.venueSuburb,
      overall_rating: payload.overallRating,
      notes: payload.notes,
      tips: payload.tips,
      visit_date: payload.visitDate,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    logError("/api/community POST", err);
    return NextResponse.json(
      { error: "Failed to save community note." },
      { status: 500 }
    );
  }
}
