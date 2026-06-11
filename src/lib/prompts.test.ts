import { describe, expect, it } from "vitest";
import {
  SOCIAL_STORY_SYSTEM_PROMPT,
  VENUE_EXTRACTION_SYSTEM_PROMPT,
  buildItineraryPrompt,
} from "./prompts";
import type { SensoryProfile } from "@/types/sensory-profile";

const baseProfile: SensoryProfile = {
  soundSensitivity: "medium",
  lightSensitivity: "low",
  smellSensitivity: "low",
  crowdSensitivity: "medium",
  changeSensitivity: "medium",
  touchSensitivity: "low",
  visitingWith: "alone",
  detailLevel: "detailed",
  communicationStyle: "mixed",
  needsQuietSpace: false,
  needsAccessibleToilet: false,
  needsMobilityAccess: false,
  needsDietaryInfo: false,
  usesMobilityAid: false,
  hasMedicalNeeds: false,
  wantsSocialStory: true,
  wantsAffirmations: true,
  wantsTextToSpeech: false,
  copingStrategies: [],
  groundingTechniques: [],
  exitStrategy: "",
  prefersDyslexicFont: false,
  prefersHighContrast: false,
  prefersReducedMotion: false,
  needsLevelBoardingInfo: false,
  needsLiveLiftInfo: false,
  routePreference: "balanced",
  supportCardName: "",
  supportCardMessage: "",
  emergencyContacts: [],
};

describe("prompts", () => {
  it("VENUE_EXTRACTION_SYSTEM_PROMPT is a non-empty string", () => {
    expect(typeof VENUE_EXTRACTION_SYSTEM_PROMPT).toBe("string");
    expect(VENUE_EXTRACTION_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(VENUE_EXTRACTION_SYSTEM_PROMPT).toContain("JSON");
    expect(VENUE_EXTRACTION_SYSTEM_PROMPT).toContain("(estimated)");
  });

  it("SOCIAL_STORY_SYSTEM_PROMPT is a non-empty string", () => {
    expect(typeof SOCIAL_STORY_SYSTEM_PROMPT).toBe("string");
    expect(SOCIAL_STORY_SYSTEM_PROMPT.length).toBeGreaterThan(50);
    expect(SOCIAL_STORY_SYSTEM_PROMPT).toContain("social story");
  });

  it("buildItineraryPrompt includes sensitivity summary when sensitivities are raised", () => {
    const result = buildItineraryPrompt({
      ...baseProfile,
      soundSensitivity: "high",
      crowdSensitivity: "high",
      changeSensitivity: "high",
    });

    expect(result).toContain("Sound sensitivity: high");
    expect(result).toContain("Crowd sensitivity: high");
    expect(result).toContain("Sensitivity to unexpected change: high");
  });

  it("buildItineraryPrompt omits low sensitivities from summary", () => {
    const result = buildItineraryPrompt({
      ...baseProfile,
      soundSensitivity: "low",
      crowdSensitivity: "low",
      changeSensitivity: "low",
    });

    expect(result).not.toContain("Sound sensitivity");
    expect(result).not.toContain("Crowd sensitivity");
    expect(result).toContain("none specified");
  });

  it("buildItineraryPrompt includes accessibility needs when set", () => {
    const result = buildItineraryPrompt({
      ...baseProfile,
      needsQuietSpace: true,
      needsAccessibleToilet: true,
      needsMobilityAccess: true,
      needsDietaryInfo: true,
      hasMedicalNeeds: true,
    });

    expect(result).toContain("needs quiet space information");
    expect(result).toContain("needs accessible toilet locations");
    expect(result).toContain("needs step-free access routes");
    expect(result).toContain("needs detailed dietary/allergen information");
    expect(result).toContain("has medical needs");
  });

  it("buildItineraryPrompt reflects wantsSocialStory and wantsAffirmations", () => {
    const with_ = buildItineraryPrompt({
      ...baseProfile,
      wantsSocialStory: true,
      wantsAffirmations: true,
    });
    const without = buildItineraryPrompt({
      ...baseProfile,
      wantsSocialStory: false,
      wantsAffirmations: false,
    });

    expect(with_).toContain("Wants social story: yes");
    expect(with_).toContain("Wants affirmations: yes");
    expect(without).toContain("Wants social story: no");
    expect(without).toContain("Wants affirmations: no");
  });
});
