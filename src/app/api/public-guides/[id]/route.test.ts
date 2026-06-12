import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Itinerary } from "@/types/itinerary";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

import { GET } from "./route";

const makeItinerary = (): Itinerary => ({
  id: "5b1d4db2-1d1b-4f06-bd23-9d4d0f7f9e11",
  venueData: {
    name: "Public Venue",
    url: "https://example.com/public",
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
  sections: [],
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
  privateNotes: "owner-only",
  sharedWith: [{ email: "viewer@example.com", role: "viewer" }],
  sharedWithEmails: ["viewer@example.com"],
  lockedSectionIds: ["intro"],
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("public guide route", () => {
  it("strips private notes and collaborator emails before returning a public guide", async () => {
    const itinerary = makeItinerary();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { itinerary_json: itinerary, is_public: true },
      error: null,
    });

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle,
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => query),
    } as never);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-123" }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { itinerary: Itinerary };
    expect(payload.itinerary.privateNotes).toBeUndefined();
    expect(payload.itinerary.sharedWith).toEqual([]);
    expect(payload.itinerary.sharedWithEmails).toEqual([]);
    expect(payload.itinerary.lockedSectionIds).toEqual(["intro"]);
  });

  it("returns 404 when the guide is not public", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle,
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => query),
    } as never);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "missing-guide" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 500 when the public guide query fails", async () => {
    const dbError = new Error("db unavailable");
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: dbError });
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle,
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => query),
    } as never);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "guide-err" }),
    });

    expect(response.status).toBe(500);
    expect(vi.mocked(logError)).toHaveBeenCalledWith("/api/public-guides/:id GET", dbError);
  });
});
