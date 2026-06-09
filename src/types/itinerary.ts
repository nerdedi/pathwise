import type { SensoryProfile } from "./sensory-profile";
import type { VenueData } from "./venue";

export type CollaborationRole = "viewer" | "editor";

export interface SharedCollaborator {
  email: string;
  role: CollaborationRole;
}

export interface TransportLeg {
  mode: "train" | "bus" | "light-rail" | "ferry" | "walk";
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  line?: string;
  platform?: string;
  accessibilityNotes?: string;
  approximateSteps?: number;
  stepByStepInstructions?: string[];
  crowdingLevel?: "low" | "medium" | "high";
  noiseLevel?: "low" | "medium" | "high";
  levelBoarding?: boolean;
  onboardToilet?: boolean;
  liftStatus?: "available" | "outage" | "unknown";
  stationFacilities?: string[];
  disruptionInfo?: string;
}

export interface TransportPlan {
  fromSuburb: string;
  toVenue: string;
  totalDurationMinutes: number;
  legs: TransportLeg[];
  totalApproximateSteps: number;
  accessibleRoute: boolean;
  notes: string;
  routePreference?: "balanced" | "fastest" | "quietest";
  stressScore?: number;
  journeyReminder?: string;
  stationWayfinding?: Array<{
    stationName: string;
    stepFreeAccess: boolean;
    accessibleToilet: boolean;
    toilets: boolean;
    liftStatus: "operational" | "unknown" | "out";
    seating: boolean;
    helpPoint: boolean;
    levelBoardingAvailable?: boolean;
    onboardToiletAvailable?: boolean;
    notes?: string;
  }>;
  liveUpdates?: string[];
  reminders?: string[];
}

export interface WeatherForecast {
  date: string;
  condition: string;
  conditionDescription: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  chanceOfRain: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  packingRecommendations: string[];
}

export interface PackingItem {
  item: string;
  reason: string;
  priority: "essential" | "recommended" | "optional";
  category: "sensory" | "comfort" | "medical" | "practical" | "food";
}

export interface SocialStoryPanel {
  sequence: number;
  title: string;
  text: string; // Simple, plain language
  imagePrompt?: string; // For AI image generation
  imageUrl?: string;
  emotion?: "calm" | "curious" | "happy" | "uncertain" | "proud";
}

export interface CrisisPlan {
  steps: string[];
  quietRooms: string[];
  exits: string[];
  helpDeskLocation: string;
  venuePhone?: string;
  supportPersonContact?: string;
  selfCareReminders: string[];
}

export interface Affirmation {
  text: string;
  timing: "before" | "during" | "overwhelmed" | "after";
}

export interface ItinerarySection {
  id: string;
  title: string;
  emoji: string;
  content: string;
  details?: string[];
  isExpandable?: boolean;
}

export interface Itinerary {
  id: string;
  venueData: VenueData;
  sensoryProfile: SensoryProfile;
  visitDate?: string;
  fromSuburb?: string;

  // Generated content
  sections: ItinerarySection[];
  transportTo?: TransportPlan;
  transportFrom?: TransportPlan;
  weather?: WeatherForecast;
  packingList: PackingItem[];
  crisisPlan: CrisisPlan;
  affirmations: Affirmation[];
  socialStory: SocialStoryPanel[];

  // Risk assessment
  riskScore: number;
  riskSummary: string;
  riskDetails: Record<string, { score: number; detail: string }>;

  // Meta
  generatedAt: string;
  userId?: string;
  sharedWith?: SharedCollaborator[];
  sharedWithEmails?: string[];
  privateNotes?: string;
}
