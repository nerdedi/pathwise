import {
    getCollaboratorRole,
    mergeSectionsRespectingLocks,
    normalizeCollaborators,
    sanitizeItineraryForAccess,
} from "@/lib/collaboration";
import { logError } from "@/lib/logger";
import { recordModerationEvent } from "@/lib/moderation-telemetry";
import { sanitizeSocialStoryPanelsForStorage } from "@/lib/social-story";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Itinerary } from "@/types/itinerary";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

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

function resolveSafetyTrigger(issues: string[]) {
  return issues.some((issue) => issue.toLowerCase().includes("copyright"))
    ? "copyright"
    : "unsafe";
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
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
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (data?.itinerary_json) {
      const itinerary = sanitizeItineraryForAccess(data.itinerary_json as Itinerary, true);
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
        .eq("id", id)
        .maybeSingle();

      if (sharedError) throw sharedError;

      const sharedRole = getCollaboratorRole(
        sharedGuide?.itinerary_json as Itinerary | null,
        user.email.toLowerCase()
      );

      if (sharedGuide?.itinerary_json && sharedRole) {
        const itinerary = sanitizeItineraryForAccess(sharedGuide.itinerary_json as Itinerary, false);
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
    logError("/api/guides/:id GET", err);
    return NextResponse.json(
      { error: "Failed to load guide." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
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
    const { itinerary } = UpdateGuideSchema.parse(body);

    if (itinerary.id !== id) {
      return NextResponse.json(
        { error: "Guide id mismatch" },
        { status: 400 }
      );
    }

    const itineraryData = itinerary as unknown as Itinerary;

    if (itineraryData.lastEditedAt) {
      const { data: ownerSnapshot, error: ownerSnapshotError } = await supabase
        .from("itineraries")
        .select("itinerary_json")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownerSnapshotError) throw ownerSnapshotError;

      const existingOwner = ownerSnapshot?.itinerary_json as Itinerary | null;
      if (
        existingOwner?.lastEditedAt &&
        existingOwner.lastEditedAt !== itineraryData.lastEditedAt
      ) {
        return NextResponse.json(
          {
            error: "Guide was edited by someone else. Please reload and try again.",
            conflict: true,
          },
          { status: 409 }
        );
      }
    }

    const sanitizedSocialStory = sanitizeSocialStoryPanelsForStorage(
      itineraryData.socialStory ?? []
    );

    if (sanitizedSocialStory.imageSourceIssues.length > 0) {
      recordModerationEvent({
        route: "/api/guides/:id PUT",
        trigger: "image-source",
        panelCount: itineraryData.socialStory?.length ?? 0,
        issuesCount: sanitizedSocialStory.imageSourceIssues.length,
      });
      return NextResponse.json(
        {
          error:
            "Social story contains unsupported image sources. Please use uploaded images or approved open-source images.",
          issues: sanitizedSocialStory.imageSourceIssues.slice(0, 3),
        },
        { status: 400 }
      );
    }

    if (!sanitizedSocialStory.safety.ok) {
      const trigger = resolveSafetyTrigger(sanitizedSocialStory.safety.issues);
      recordModerationEvent({
        route: "/api/guides/:id PUT",
        trigger,
        panelCount: itineraryData.socialStory?.length ?? 0,
        issuesCount: sanitizedSocialStory.safety.issues.length,
      });
      return NextResponse.json(
        {
          error:
            "Social story contains disallowed content. Please remove unsafe or copyrighted language.",
          issues: sanitizedSocialStory.safety.issues.slice(0, 3),
        },
        { status: 400 }
      );
    }

    const sanitizedItineraryData: Itinerary = {
      ...itineraryData,
      socialStory: sanitizedSocialStory.panels,
    };
    const normalizedCollaborators = normalizeCollaborators(sanitizedItineraryData);
    const nowIso = new Date().toISOString();
    const ownerReadyItinerary: Itinerary = {
      ...itineraryData,
      ...sanitizedItineraryData,
      sharedWith: normalizedCollaborators,
      sharedWithEmails: normalizedCollaborators.map((item) => item.email),
      lastEditedAt: nowIso,
      lastEditedByEmail: user.email?.toLowerCase(),
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
      .eq("id", id)
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
        .eq("id", id)
        .maybeSingle();

      if (sharedError) throw sharedError;

      const existingShared = sharedGuide?.itinerary_json as Itinerary | null;

      if (
        itineraryData.lastEditedAt &&
        existingShared?.lastEditedAt &&
        existingShared.lastEditedAt !== itineraryData.lastEditedAt
      ) {
        return NextResponse.json(
          {
            error: "Guide was edited by someone else. Please reload and try again.",
            conflict: true,
          },
          { status: 409 }
        );
      }

      const collaboratorRole = getCollaboratorRole(existingShared, user.email.toLowerCase());

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
        ...sanitizedItineraryData,
        sections: mergeSectionsRespectingLocks(existingShared, sanitizedItineraryData),
        lockedSectionIds: existingShared.lockedSectionIds,
        privateNotes: existingShared.privateNotes,
        sharedWith: protectedCollaborators,
        sharedWithEmails: protectedCollaborators.map((item) => item.email),
        lastEditedAt: nowIso,
        lastEditedByEmail: user.email.toLowerCase(),
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
        .eq("id", id);

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

    logError("/api/guides/:id PUT", err);
    return NextResponse.json(
      { error: "Failed to update guide." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: deletedRows, error } = await supabase
      .from("itineraries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("/api/guides/:id DELETE", err);
    return NextResponse.json(
      { error: "Failed to delete guide." },
      { status: 500 }
    );
  }
}
