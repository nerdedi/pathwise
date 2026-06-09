import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: { id: string } };

const UpdateGuideSchema = z.object({
  itinerary: z
    .object({
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
    })
    .passthrough(),
});

export async function GET(_req: NextRequest, { params }: Params) {
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
      .select("itinerary_json")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (data?.itinerary_json) {
      return NextResponse.json({ itinerary: data.itinerary_json });
    }

    const admin = createAdminClient();
    if (admin && user.email) {
      const { data: sharedGuide, error: sharedError } = await admin
        .from("itineraries")
        .select("itinerary_json")
        .eq("id", params.id)
        .maybeSingle();

      if (sharedError) throw sharedError;

      const sharedEmails =
        ((sharedGuide?.itinerary_json as { sharedWithEmails?: string[] } | null)
          ?.sharedWithEmails ?? []) as string[];

      if (sharedGuide?.itinerary_json && sharedEmails.includes(user.email)) {
        return NextResponse.json({ itinerary: sharedGuide.itinerary_json });
      }
    }

    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  } catch (err) {
    console.error("[/api/guides/:id GET]", err);
    return NextResponse.json(
      { error: "Failed to load guide." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { itinerary } = UpdateGuideSchema.parse(body);

    if (itinerary.id !== params.id) {
      return NextResponse.json(
        { error: "Guide id mismatch" },
        { status: 400 }
      );
    }

    const { data: ownerRows, error } = await supabase
      .from("itineraries")
      .update({
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
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!ownerRows || ownerRows.length === 0) {
      const admin = createAdminClient();
      if (!admin || !user.email) {
        return NextResponse.json({ error: "Guide not found" }, { status: 404 });
      }

      const { data: sharedGuide, error: sharedError } = await admin
        .from("itineraries")
        .select("itinerary_json")
        .eq("id", params.id)
        .maybeSingle();

      if (sharedError) throw sharedError;

      const sharedEmails =
        ((sharedGuide?.itinerary_json as { sharedWithEmails?: string[] } | null)
          ?.sharedWithEmails ?? []) as string[];

      if (!sharedGuide?.itinerary_json || !sharedEmails.includes(user.email)) {
        return NextResponse.json({ error: "Guide not found" }, { status: 404 });
      }

      const { error: collaboratorError } = await admin
        .from("itineraries")
        .update({
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
        })
        .eq("id", params.id);

      if (collaboratorError) throw collaboratorError;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    console.error("[/api/guides/:id PUT]", err);
    return NextResponse.json(
      { error: "Failed to update guide." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase
      .from("itineraries")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/guides/:id DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete guide." },
      { status: 500 }
    );
  }
}
