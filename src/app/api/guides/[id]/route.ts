import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Itinerary, SharedCollaborator } from "@/types/itinerary";
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

const normalizeCollaborators = (itinerary: Itinerary | null | undefined) => {
  const fromStructured = (itinerary?.sharedWith ?? [])
    .map((item): SharedCollaborator | null => {
      if (!item?.email || typeof item.email !== "string") return null;
      const email = item.email.trim().toLowerCase();
      if (!email) return null;

      return {
        email,
        role: item.role === "viewer" ? "viewer" : "editor",
      };
    })
    .filter(Boolean) as SharedCollaborator[];

  if (fromStructured.length > 0) {
    return fromStructured;
  }

  return (itinerary?.sharedWithEmails ?? [])
    .filter((email): email is string => typeof email === "string")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .map((email) => ({ email, role: "editor" as const }));
};

const findCollaboratorRole = (itinerary: Itinerary | null | undefined, email: string) => {
  const collaborators = normalizeCollaborators(itinerary);
  const match = collaborators.find((collaborator) => collaborator.email === email.toLowerCase());
  return match?.role;
};

const sanitizeForAccess = (itinerary: Itinerary, isOwner: boolean) => {
  const normalizedCollaborators = normalizeCollaborators(itinerary);
  const base: Itinerary = {
    ...itinerary,
    sharedWith: normalizedCollaborators,
    sharedWithEmails: normalizedCollaborators.map((item) => item.email),
  };

  if (isOwner) {
    return base;
  }

  const { privateNotes: _privateNotes, ...withoutPrivateNotes } = base;
  return withoutPrivateNotes;
};

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
      const itinerary = sanitizeForAccess(data.itinerary_json as Itinerary, true);
      return NextResponse.json({
        itinerary,
        permissions: {
          accessRole: "owner",
          canEdit: true,
          canManageCollaborators: true,
        },
      });
    }

    const admin = createAdminClient();
    if (admin && user.email) {
      const { data: sharedGuide, error: sharedError } = await admin
        .from("itineraries")
        .select("itinerary_json")
        .eq("id", params.id)
        .maybeSingle();

      if (sharedError) throw sharedError;

      const sharedRole = findCollaboratorRole(
        sharedGuide?.itinerary_json as Itinerary | null,
        user.email.toLowerCase()
      );

      if (sharedGuide?.itinerary_json && sharedRole) {
        const itinerary = sanitizeForAccess(sharedGuide.itinerary_json as Itinerary, false);
        return NextResponse.json({
          itinerary,
          permissions: {
            accessRole: sharedRole,
            canEdit: sharedRole === "editor",
            canManageCollaborators: false,
          },
        });
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

    const normalizedCollaborators = normalizeCollaborators(itinerary as Itinerary);
    const ownerReadyItinerary: Itinerary = {
      ...(itinerary as Itinerary),
      sharedWith: normalizedCollaborators,
      sharedWithEmails: normalizedCollaborators.map((item) => item.email),
    };

    const { data: ownerRows, error } = await supabase
      .from("itineraries")
      .update({
        venue_name: itinerary.venueData.name,
        venue_url: itinerary.venueData.url,
        venue_address: itinerary.venueData.address,
        venue_suburb: itinerary.venueData.suburb,
        visit_date: itinerary.visitDate,
        from_suburb: itinerary.fromSuburb,
        itinerary_json: ownerReadyItinerary,
        risk_score: itinerary.riskScore,
        overall_sensory_rating: itinerary.venueData.overallSensoryRating,
        shared_with_emails: ownerReadyItinerary.sharedWithEmails ?? [],
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

      const existingShared = sharedGuide?.itinerary_json as Itinerary | null;
      const collaboratorRole = findCollaboratorRole(existingShared, user.email.toLowerCase());

      if (!existingShared || !collaboratorRole) {
        return NextResponse.json({ error: "Guide not found" }, { status: 404 });
      }

      if (collaboratorRole !== "editor") {
        return NextResponse.json(
          { error: "You have view-only access to this guide." },
          { status: 403 }
        );
      }

      const protectedCollaborators = normalizeCollaborators(existingShared);
      const collaboratorSafeUpdate: Itinerary = {
        ...(itinerary as Itinerary),
        privateNotes: existingShared.privateNotes,
        sharedWith: protectedCollaborators,
        sharedWithEmails: protectedCollaborators.map((item) => item.email),
      };

      const { error: collaboratorError } = await admin
        .from("itineraries")
        .update({
          venue_name: itinerary.venueData.name,
          venue_url: itinerary.venueData.url,
          venue_address: itinerary.venueData.address,
          venue_suburb: itinerary.venueData.suburb,
          visit_date: itinerary.visitDate,
          from_suburb: itinerary.fromSuburb,
          itinerary_json: collaboratorSafeUpdate,
          risk_score: itinerary.riskScore,
          overall_sensory_rating: itinerary.venueData.overallSensoryRating,
          shared_with_emails: collaboratorSafeUpdate.sharedWithEmails ?? [],
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
