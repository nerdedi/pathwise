import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PatchSchema = z.object({
  id: z.string().uuid().optional(),
  markAllRead: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = Number(searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(50, Math.floor(limitRaw)))
      : 20;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_notifications")
      .select("id, notification_type, title, body, metadata, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({
      notifications: (data ?? []).map((row) => ({
        id: row.id,
        type: row.notification_type,
        title: row.title,
        body: row.body,
        metadata: row.metadata,
        readAt: row.read_at,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    logError("/api/notifications GET", err);
    return NextResponse.json(
      { error: "Failed to load notifications." },
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

    const payload = PatchSchema.parse(await req.json());

    const nowIso = new Date().toISOString();

    if (payload.markAllRead) {
      const { error } = await supabase
        .from("user_notifications")
        .update({ read_at: nowIso })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (!payload.id) {
      return NextResponse.json({ error: "Notification id is required." }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: nowIso })
      .eq("user_id", user.id)
      .eq("id", payload.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    logError("/api/notifications PATCH", err);
    return NextResponse.json(
      { error: "Failed to update notifications." },
      { status: 500 }
    );
  }
}
