import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const RequestSchema = z.object({
  isPublic: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { isPublic } = RequestSchema.parse(body);

    const { error } = await supabase
      .from("itineraries")
      .update({ is_public: isPublic })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true, isPublic });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid visibility payload" },
        { status: 400 }
      );
    }

    logError("/api/guides/:id/visibility PATCH", err);
    return NextResponse.json(
      { error: "Failed to update guide visibility." },
      { status: 500 }
    );
  }
}
