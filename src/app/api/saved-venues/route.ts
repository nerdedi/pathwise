import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SaveVenueSchema = z.object({
  venueUrl: z.string().url(),
  venueName: z.string().min(1),
  notificationsEnabled: z.boolean().optional(),
});

const UpdateSavedVenueSchema = z.object({
  venueUrl: z.string().url(),
  notificationsEnabled: z.boolean(),
});

const DeleteSavedVenueSchema = z.object({
  venueUrl: z.string().url(),
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
      .from("user_saved_venues")
      .select("id, venue_url, venue_name, notifications_enabled, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      savedVenues: (data ?? []).map((row) => ({
        id: row.id,
        venueUrl: row.venue_url,
        venueName: row.venue_name,
        notificationsEnabled: row.notifications_enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (err) {
    logError("/api/saved-venues GET", err);
    return NextResponse.json(
      { error: "Failed to load saved venues." },
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

    const payload = SaveVenueSchema.parse(await req.json());

    const { error } = await supabase.from("user_saved_venues").upsert(
      {
        user_id: user.id,
        venue_url: payload.venueUrl,
        venue_name: payload.venueName,
        notifications_enabled: payload.notificationsEnabled ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,venue_url" }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    logError("/api/saved-venues POST", err);
    return NextResponse.json(
      { error: "Failed to save venue." },
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

    const payload = UpdateSavedVenueSchema.parse(await req.json());

    const { error } = await supabase
      .from("user_saved_venues")
      .update({
        notifications_enabled: payload.notificationsEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("venue_url", payload.venueUrl);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    logError("/api/saved-venues PATCH", err);
    return NextResponse.json(
      { error: "Failed to update saved venue." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = DeleteSavedVenueSchema.parse(await req.json());

    const { error } = await supabase
      .from("user_saved_venues")
      .delete()
      .eq("user_id", user.id)
      .eq("venue_url", payload.venueUrl);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    logError("/api/saved-venues DELETE", err);
    return NextResponse.json(
      { error: "Failed to remove saved venue." },
      { status: 500 }
    );
  }
}
