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

  it("keeps private notes for owner access and normalizes collaborators", () => {
    const itinerary = makeItinerary({
      privateNotes: "owner-only",
      sharedWithEmails: ["LegacyOne@example.com", "LegacyTwo@example.com"],
      lockedSectionIds: ["arrival", "inside"],
    });

    const sanitized = sanitizeItineraryForAccess(itinerary, true);

    expect(sanitized.privateNotes).toBe("owner-only");
    expect(sanitized.sharedWith).toEqual([
      { email: "legacyone@example.com", role: "editor" },
      { email: "legacytwo@example.com", role: "editor" },
    ]);
    expect(sanitized.sharedWithEmails).toEqual([
      "legacyone@example.com",
      "legacytwo@example.com",
    ]);
    expect(sanitized.lockedSectionIds).toEqual(["arrival", "inside"]);
  });

  it("returns no collaborator role for blank emails", () => {
    expect(getCollaboratorRole({ sharedWith: [], sharedWithEmails: [] }, "   ")).toBeUndefined();
  });

  it("returns empty collaborators for null itinerary", () => {
    expect(normalizeCollaborators(null)).toEqual([]);
    expect(normalizeCollaborators(undefined)).toEqual([]);
  });

  it("filters out sharedWith entries with missing or invalid emails", () => {
    const result = normalizeCollaborators({
      sharedWith: [
        { email: "", role: "viewer" },
        { email: null as unknown as string, role: "editor" },
        { email: "   ", role: "viewer" },
        { email: "valid@example.com", role: "editor" },
      ],
      sharedWithEmails: [],
    });
    expect(result).toEqual([{ email: "valid@example.com", role: "editor" }]);
  });

  it("returns empty array for non-array lockedSectionIds", () => {
    expect(normalizeLockedSectionIds(null)).toEqual([]);
    expect(normalizeLockedSectionIds("arrival")).toEqual([]);
    expect(normalizeLockedSectionIds(42)).toEqual([]);
    expect(normalizeLockedSectionIds(undefined)).toEqual([]);
  });

  it("falls back to existing section when next has no matching replacement", () => {
    const existing = makeItinerary({ lockedSectionIds: [] });
    const next = makeItinerary({
      sections: [
        {
          id: "arrival",
          title: "Arrival",
          emoji: "🚪",
          content: "Updated arrival",
          details: [],
        },
        // "inside" section is deliberately omitted
      ],
    });

    const merged = mergeSectionsRespectingLocks(existing, next);
    // "inside" should fall back to the existing section
    expect(merged.find((s) => s.id === "inside")?.content).toBe("Original inside");
  });
});
