import type { Itinerary } from "@/types/itinerary";
import { describe, expect, it } from "vitest";
import {
    getCollaboratorRole,
    mergeSectionsRespectingLocks,
    normalizeCollaborators,
    normalizeLockedSectionIds,
    sanitizeItineraryForAccess,
} from "./collaboration";

const makeItinerary = (overrides: Partial<Itinerary> = {}): Itinerary => ({
  id: "9d2c6df1-73d2-4a8d-a5e2-aa56292a2a4c",
  venueData: {
    name: "Test Venue",
    url: "https://example.com/venue",
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
    emergencyContacts: [],
  },
  sections: [
    {
      id: "arrival",
      title: "Arrival",
      emoji: "🚪",
      content: "Original arrival",
      details: ["Original detail"],
    },
    {
      id: "inside",
      title: "Inside",
      emoji: "🧭",
      content: "Original inside",
      details: ["Original inside detail"],
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
  ...overrides,
});

describe("collaboration helpers", () => {
  it("normalizes structured collaborators", () => {
    const collaborators = normalizeCollaborators({
      sharedWith: [
        { email: " Viewer@Example.com ", role: "viewer" },
        { email: "editor@example.com", role: "editor" },
      ],
      sharedWithEmails: ["legacy@example.com"],
    });

    expect(collaborators).toEqual([
      { email: "viewer@example.com", role: "viewer" },
      { email: "editor@example.com", role: "editor" },
    ]);
  });

  it("falls back legacy sharedWithEmails to editor role", () => {
    const collaborators = normalizeCollaborators({
      sharedWithEmails: ["Legacy@Example.com"],
      sharedWith: [],
    });

    expect(collaborators).toEqual([
      { email: "legacy@example.com", role: "editor" },
    ]);
  });

  it("returns collaborator role by email", () => {
    const role = getCollaboratorRole(
      {
        sharedWith: [{ email: "person@example.com", role: "viewer" }],
        sharedWithEmails: [],
      },
      "PERSON@example.com"
    );

    expect(role).toBe("viewer");
  });

  it("normalizes locked section ids", () => {
    expect(normalizeLockedSectionIds([" arrival ", "", 1, "inside"]))
      .toEqual(["arrival", "inside"]);
  });

  it("keeps locked sections from existing itinerary", () => {
    const existing = makeItinerary({ lockedSectionIds: ["arrival"] });
    const next = makeItinerary({
      sections: [
        {
          id: "arrival",
          title: "Arrival",
          emoji: "🚪",
          content: "Changed arrival",
          details: ["Changed"],
        },
        {
          id: "inside",
          title: "Inside",
          emoji: "🧭",
          content: "Changed inside",
          details: ["Changed inside"],
        },
      ],
    });

    const merged = mergeSectionsRespectingLocks(existing, next);

    expect(merged.find((section) => section.id === "arrival")?.content).toBe("Original arrival");
    expect(merged.find((section) => section.id === "inside")?.content).toBe("Changed inside");
  });

  it("strips private notes for non-owner access", () => {
    const itinerary = makeItinerary({
      privateNotes: "owner-only",
      sharedWith: [{ email: "viewer@example.com", role: "viewer" }],
      lockedSectionIds: ["arrival"],
    });

    const sanitized = sanitizeItineraryForAccess(itinerary, false);

    expect(sanitized.privateNotes).toBeUndefined();
    expect(sanitized.sharedWith).toEqual([{ email: "viewer@example.com", role: "viewer" }]);
    expect(sanitized.lockedSectionIds).toEqual(["arrival"]);
  });
});
