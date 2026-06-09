import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Itinerary } from "@/types/itinerary";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { GET, PUT } from "./route";

const makeItinerary = (overrides: Partial<Itinerary> = {}): Itinerary => ({
  id: "5b1d4db2-1d1b-4f06-bd23-9d4d0f7f9e11",
  venueData: {
    name: "Shared Venue",
    url: "https://example.com/shared",
  },
  sensoryProfile: {
    soundSensitivity: "medium",
    lightSensitivity: "medium",
    smellSensitivity: "medium",
    crowdSensitivity: "medium",
    touchSensitivity: "low",
    changeSensitivity: "medium",
    visitingWith: "alone",
    communicationStyle: "mixed",
    detailLevel: "detailed",
    needsQuietSpace: false,
    needsAccessibleToilet: false,
    needsMobilityAccess: false,
    needsDietaryInfo: false,
    usesMobilityAid: false,
    hasMedicalNeeds: false,
    copingStrategies: [],
    exitStrategy: "",
    prefersDyslexicFont: false,
    prefersHighContrast: false,
    prefersReducedMotion: false,
    wantsSocialStory: true,
    wantsAffirmations: true,
    wantsTextToSpeech: true,
    routePreference: "balanced",
    needsLevelBoardingInfo: false,
    needsLiveLiftInfo: false,
    supportCardName: "",
    supportCardMessage: "",
    groundingTechniques: [],
    emergencyContacts: [],
  },
  sections: [
    {
      id: "intro",
      title: "Intro",
      emoji: "👋",
      content: "Owner intro",
      details: ["Owner detail"],
    },
    {
      id: "arrival",
      title: "Arrival",
      emoji: "🚪",
      content: "Owner arrival",
      details: ["Owner arrival detail"],
    },
  ],
  packingList: [],
  crisisPlan: {
    steps: [],
    quietRooms: [],
    exits: [],
    helpDeskLocation: "",
    selfCareReminders: [],
  },
  affirmations: [],
  socialStory: [],
  riskScore: 1,
  riskSummary: "Low",
  riskDetails: {},
  generatedAt: new Date().toISOString(),
  sharedWith: [{ email: "viewer@example.com", role: "viewer" }],
  sharedWithEmails: ["viewer@example.com"],
  lockedSectionIds: ["intro"],
  privateNotes: "owner-only",
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("guide detail route", () => {
  it("returns owner permissions for the signed-in owner", async () => {
    const ownerItinerary = makeItinerary();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { itinerary_json: ownerItinerary },
      error: null,
    });

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle,
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "owner@example.com" } } }) },
      from: vi.fn(() => query),
    } as never);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-123" }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { itinerary: Itinerary; permissions: { accessRole: string; canEdit: boolean; canManageCollaborators: boolean } };
    expect(payload.permissions).toEqual({
      accessRole: "owner",
      canEdit: true,
      canManageCollaborators: true,
    });
    expect(payload.itinerary.privateNotes).toBe("owner-only");
  });

  it("returns read-only permissions for a viewer collaborator", async () => {
    const sharedItinerary = makeItinerary();
    const ownerQuery = {
      select: vi.fn(() => ownerQuery),
      eq: vi.fn(() => ownerQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const adminQuery = {
      select: vi.fn(() => adminQuery),
      eq: vi.fn(() => adminQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { itinerary_json: sharedItinerary },
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "viewer@example.com" } } }) },
      from: vi.fn(() => ownerQuery),
    } as never);

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => adminQuery),
    } as never);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-123" }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { itinerary: Itinerary; permissions: { accessRole: string; canEdit: boolean; canManageCollaborators: boolean } };
    expect(payload.permissions).toEqual({
      accessRole: "viewer",
      canEdit: false,
      canManageCollaborators: false,
    });
    expect(payload.itinerary.privateNotes).toBeUndefined();
    expect(payload.itinerary.lockedSectionIds).toEqual(["intro"]);
  });

  it("blocks viewers from saving guide edits", async () => {
    const sharedItinerary = makeItinerary();
    const ownerUpdate = {
      update: vi.fn(() => ownerUpdate),
      eq: vi.fn(() => ownerUpdate),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const ownerQuery = {
      select: vi.fn(() => ownerQuery),
      eq: vi.fn(() => ownerQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const adminQuery = {
      select: vi.fn(() => adminQuery),
      eq: vi.fn(() => adminQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { itinerary_json: sharedItinerary },
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "viewer@example.com" } } }) },
      from: vi.fn((table: string) => (table === "itineraries" ? ownerUpdate : ownerQuery)),
    } as never);

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => adminQuery),
    } as never);

    const body = {
      itinerary: {
        ...sharedItinerary,
        sections: sharedItinerary.sections.map((section) =>
          section.id === "arrival"
            ? { ...section, content: "Viewer edit attempt" }
            : section
        ),
      },
    };

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }) as never,
      {
        params: Promise.resolve({ id: sharedItinerary.id }),
      }
    );

    expect(response.status).toBe(403);
    expect(ownerUpdate.update).toHaveBeenCalled();
    expect(adminQuery.maybeSingle).toHaveBeenCalled();
  });
});
