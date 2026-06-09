export type SensorySensitivity = "low" | "medium" | "high";

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export type RoutePreference = "balanced" | "fastest" | "quietest";

export interface SensoryProfile {
  id?: string;
  userId?: string;

  // Sensory sensitivities
  soundSensitivity: SensorySensitivity;
  lightSensitivity: SensorySensitivity;
  smellSensitivity: SensorySensitivity;
  crowdSensitivity: SensorySensitivity;
  touchSensitivity: SensorySensitivity;
  changeSensitivity: SensorySensitivity; // sensitivity to unexpected changes

  // Communication & support
  visitingWith: "alone" | "support-person" | "family" | "group";
  communicationStyle: "minimal-text" | "detailed-text" | "visual" | "mixed";
  detailLevel: "basic" | "detailed" | "comprehensive";

  // Needs
  needsQuietSpace: boolean;
  needsAccessibleToilet: boolean;
  needsMobilityAccess: boolean;
  needsDietaryInfo: boolean;
  usesMobilityAid: boolean;
  hasMedicalNeeds: boolean;

  // Coping strategies
  copingStrategies: string[]; // e.g. ["noise-cancelling headphones", "fidget toy"]
  exitStrategy: string; // what they do if overwhelmed

  // Preferences
  prefersDyslexicFont: boolean;
  prefersHighContrast: boolean;
  prefersReducedMotion: boolean;
  wantsSocialStory: boolean;
  wantsAffirmations: boolean;
  wantsTextToSpeech: boolean;

  // Travel + support
  routePreference: RoutePreference;
  needsLevelBoardingInfo: boolean;
  needsLiveLiftInfo: boolean;
  supportCardName: string;
  supportCardMessage: string;
  emergencyContacts: EmergencyContact[];

  createdAt?: string;
}

export const defaultSensoryProfile: SensoryProfile = {
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
  supportCardMessage: "I may need a little extra time and clear instructions.",
  emergencyContacts: [],
};
