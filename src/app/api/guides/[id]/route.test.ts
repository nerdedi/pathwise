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

import { DELETE, GET, PUT } from "./route";

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
  it("returns 401 when loading a guide without authentication", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-123" }),
    });

    expect(response.status).toBe(401);
  });

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

  it("returns 404 when no owner or shared guide access exists", async () => {
    const ownerQuery = {
      select: vi.fn(() => ownerQuery),
      eq: vi.fn(() => ownerQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "owner@example.com" } } }) },
      from: vi.fn(() => ownerQuery),
    } as never);

    vi.mocked(createAdminClient).mockReturnValue(null as never);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-123" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 when request itinerary id mismatches route id", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "owner@example.com" } } }) },
      from: vi.fn(),
    } as never);

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itinerary: {
            ...makeItinerary(),
            id: "11111111-1111-4111-8111-111111111111",
          },
        }),
      }) as never,
      {
        params: Promise.resolve({ id: "22222222-2222-4222-8222-222222222222" }),
      }
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when PUT payload fails schema validation", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "owner@example.com" } } }) },
      from: vi.fn(),
    } as never);

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: { id: makeItinerary().id } }),
      }) as never,
      { params: Promise.resolve({ id: makeItinerary().id }) }
    );

    expect(response.status).toBe(400);
  });

  it("allows editor collaborators to save unlocked sections via admin path", async () => {
    const sharedItinerary = makeItinerary({
      sharedWith: [{ email: "editor@example.com", role: "editor" }],
      sharedWithEmails: ["editor@example.com"],
    });

    const ownerUpdate = {
      update: vi.fn(() => ownerUpdate),
      eq: vi.fn(() => ownerUpdate),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const adminSelectQuery = {
      select: vi.fn(() => adminSelectQuery),
      eq: vi.fn(() => adminSelectQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { itinerary_json: sharedItinerary },
        error: null,
      }),
    };

    const adminUpdateQuery = {
      update: vi.fn(() => adminUpdateQuery),
      eq: vi.fn(() => adminUpdateQuery),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "editor@example.com" } } }) },
      from: vi.fn(() => ownerUpdate),
    } as never);

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        ...adminSelectQuery,
        ...adminUpdateQuery,
      })),
    } as never);

    const edited = {
      ...sharedItinerary,
      sections: sharedItinerary.sections.map((section) =>
        section.id === "arrival" ? { ...section, content: "Updated by editor" } : section
      ),
    };

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: edited }),
      }) as never,
      {
        params: Promise.resolve({ id: sharedItinerary.id }),
      }
    );

    expect(response.status).toBe(200);
    expect(ownerUpdate.select).toHaveBeenCalled();
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

  it("returns 500 when admin shared-guide fetch throws during GET", async () => {
    const ownerQuery = {
      select: vi.fn(() => ownerQuery),
      eq: vi.fn(() => ownerQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const adminQuery = {
      select: vi.fn(() => adminQuery),
      eq: vi.fn(() => adminQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error("admin db failure") }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "viewer@example.com" } } }) },
      from: vi.fn(() => ownerQuery),
    } as never);
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => adminQuery) } as never);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-123" }),
    });
    expect(response.status).toBe(500);
  });

  it("returns 401 when PUT is called without authentication", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never);

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: makeItinerary() }),
      }) as never,
      { params: Promise.resolve({ id: makeItinerary().id }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when PUT owner update finds no rows and admin client is unavailable", async () => {
    const ownerUpdate = {
      update: vi.fn(() => ownerUpdate),
      eq: vi.fn(() => ownerUpdate),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: null } } }) },
      from: vi.fn(() => ownerUpdate),
    } as never);
    vi.mocked(createAdminClient).mockReturnValue(null as never);

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: makeItinerary() }),
      }) as never,
      { params: Promise.resolve({ id: makeItinerary().id }) }
    );
    expect(response.status).toBe(404);
  });

  it("returns 500 when collaborator admin update throws", async () => {
    const sharedItinerary = makeItinerary({
      sharedWith: [{ email: "editor@example.com", role: "editor" }],
      sharedWithEmails: ["editor@example.com"],
    });

    const ownerUpdate = {
      update: vi.fn(() => ownerUpdate),
      eq: vi.fn(() => ownerUpdate),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    // Separate from() calls: first returns select chain (for maybeSingle), second returns update chain
    let adminFromCallCount = 0;
    const adminSelectChain = {
      select: vi.fn(function(this: typeof adminSelectChain) { return this; }),
      eq: vi.fn(function(this: typeof adminSelectChain) { return this; }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { itinerary_json: sharedItinerary },
        error: null,
      }),
    };
    const adminUpdateChain = {
      update: vi.fn(function(this: typeof adminUpdateChain) { return this; }),
      eq: vi.fn().mockResolvedValue({ error: new Error("admin update failed") }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "editor@example.com" } } }) },
      from: vi.fn(() => ownerUpdate),
    } as never);
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => {
        adminFromCallCount += 1;
        return adminFromCallCount === 1 ? adminSelectChain : adminUpdateChain;
      }),
    } as never);

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: sharedItinerary }),
      }) as never,
      { params: Promise.resolve({ id: sharedItinerary.id }) }
    );
    expect(response.status).toBe(500);
  });

  it("returns 404 when PUT collaborator path finds no matching guide", async () => {
    const sharedItinerary = makeItinerary();
    const ownerUpdate = {
      update: vi.fn(() => ownerUpdate),
      eq: vi.fn(() => ownerUpdate),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const adminQuery = {
      select: vi.fn(() => adminQuery),
      eq: vi.fn(() => adminQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "nobody@example.com" } } }) },
      from: vi.fn(() => ownerUpdate),
    } as never);
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => adminQuery) } as never);

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: sharedItinerary }),
      }) as never,
      { params: Promise.resolve({ id: sharedItinerary.id }) }
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when deleting without authentication", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never);

    const response = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("deletes guide for authenticated owner", async () => {
    const deleteQuery = {
      delete: vi.fn(() => deleteQuery),
      eq: vi.fn(() => deleteQuery),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "owner@example.com" } } }) },
      from: vi.fn(() => ({
        ...deleteQuery,
        error: null,
      })),
    } as never);

    const response = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-123" }),
    });

    expect(response.status).toBe(200);
  });

  it("returns 500 when delete query fails", async () => {
    const deleteStepTwo = {
      eq: vi.fn().mockResolvedValue({ error: new Error("db failure") }),
    };
    const deleteStepOne = {
      eq: vi.fn(() => deleteStepTwo),
    };
    const deleteQuery = {
      delete: vi.fn(() => deleteStepOne),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "owner@example.com" } } }) },
      from: vi.fn(() => deleteQuery),
    } as never);

    const response = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-123" }),
    });

    expect(response.status).toBe(500);
  });
});
