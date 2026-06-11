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

const PatchSchema = z.object({
  entryId: z.string().uuid(),
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
      .order("helpful_count", { ascending: false })
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

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const payload = PatchSchema.parse(body);

    const { data: existing, error: loadError } = await supabase
      .from("venue_community_data")
      .select("id, user_id, helpful_count")
      .eq("id", payload.entryId)
      .maybeSingle();

    if (loadError) throw loadError;
    if (!existing) {
      return NextResponse.json({ error: "Community note not found" }, { status: 404 });
    }

    if (existing.user_id && existing.user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot vote on your own note." },
        { status: 400 }
      );
    }

    const { error: voteError } = await supabase.from("venue_community_votes").insert({
      entry_id: payload.entryId,
      user_id: user.id,
    });

    if (voteError) {
      if ((voteError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "You have already marked this note as helpful." },
          { status: 409 }
        );
      }

      throw voteError;
    }

    const nextHelpfulCount = Number(existing.helpful_count ?? 0) + 1;

    const { error: updateError } = await supabase
      .from("venue_community_data")
      .update({ helpful_count: nextHelpfulCount })
      .eq("id", payload.entryId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, helpfulCount: nextHelpfulCount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    logError("/api/community PATCH", err);
    return NextResponse.json(
      { error: "Failed to record helpful vote." },
      { status: 500 }
    );
  }
}
