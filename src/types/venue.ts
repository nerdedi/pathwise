export interface VenueLocation {
  lat: number;
  lng: number;
}

export type FacilityType =
  | "toilet"
  | "accessible-toilet"
  | "gender-neutral-toilet"
  | "quiet-room"
  | "help-desk"
  | "cafeteria"
  | "lift"
  | "stairs"
  | "entrance"
  | "exit"
  | "first-aid"
  | "parking"
  | "drop-off"
  | "accessible-parking"
  | "prayer-room"
  | "baby-change"
  | "water-fountain"
  | "seating";

export interface Facility {
  id: string;
  type: FacilityType;
  label: string;
  description?: string;
  floor?: string;
  location?: VenueLocation;
  notes?: string;
  isAccessible?: boolean;
}

export interface SensoryRating {
  category: "sound" | "light" | "smell" | "crowd" | "overall";
  level: "low" | "medium" | "high";
  description: string;
  tipForSensitivity?: string;
}

export interface Zone {
  id: string;
  name: string;
  description: string;
  floor?: string;
  sensoryRatings: SensoryRating[];
  activities: string[];
  estimatedDuration?: string; // e.g. "20–40 minutes"
  isQuiet?: boolean;
}

export interface MenuItem {
  name: string;
  description?: string;
  price?: string;
  dietary: string[]; // e.g. ["vegan", "gluten-free", "nut-free"]
  allergens?: string[];
}

export interface Cafeteria {
  name: string;
  location?: string;
  floor?: string;
  openingHours?: string;
  priceRange?: "budget" | "moderate" | "expensive";
  menu: MenuItem[];
  seatingNotes?: string; // e.g. "quiet area available at the back"
  canBringOwnFood?: boolean;
}

export interface VenueData {
  // Basic info
  name: string;
  url: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  location: VenueLocation;
  phoneNumber?: string;
  email?: string;
  website: string;
  venueType: string; // e.g. "museum", "hospital", "café"

  // Access
  openingHours: Record<string, string>; // day -> hours
  admissionInfo?: string;
  bookingRequired?: boolean;
  bookingUrl?: string;

  // Facilities
  facilities: Facility[];
  cafeterias: Cafeteria[];
  zones: Zone[];

  // Physical environment
  atmosphereDescription: string;
  lightingDescription: string;
  soundDescription: string;
  smellDescription: string;
  overallSensoryRating: "calm" | "moderate" | "stimulating";

  // Transport
  nearestTrainStation?: string;
  nearestBusStop?: string;
  nearestLightRailStop?: string;
  parkingAvailable: boolean;
  parkingDetails?: string;
  dropOffArea?: string;
  accessibleParkingDetails?: string;

  // Social
  popularWith: string[]; // e.g. ["families", "students", "tourists"]
  peakDays: string[];
  peakTimes: string;
  quietTimes: string;

  // Purpose & activities
  whyPeopleVisit: string[];
  thingsToDo: string[];
  thingsToSee: string[];
  thingsToLearn: string[];

  // Risk & safety
  riskScore: number; // 1-10
  riskFactors: string[];
  safetyNotes: string[];
  emergencyExits: string[];

  // Contact for queries
  accessibilityContact?: string;
  accessibilityPhone?: string;
  accessibilityEmail?: string;
  liveUpdates?: string[];
  externalInsights?: {
    source?: string;
    averageRating?: number;
    totalRatings?: number;
    openNow?: boolean;
    reviewHighlights?: string[];
  };
  sourceMeta?: {
    sitePagesScanned?: number;
    hasGoogleInsights?: boolean;
    estimatedFieldPaths?: string[];
    updatedAt?: string;
    fallbackReason?: string;
  };

  scrapedAt: string;
}
