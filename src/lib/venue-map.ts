import type { SensoryProfile } from "@/types/sensory-profile";
import type { Facility, FacilityType } from "@/types/venue";

type SectionMapConfig = {
  suggestedFilterId: string;
  preferredTypes: FacilityType[];
  label: string;
};

const SECTION_MAP_CONFIG: Record<string, SectionMapConfig> = {
  "before-you-go": {
    suggestedFilterId: "access",
    preferredTypes: ["entrance", "accessible-parking", "parking", "drop-off", "help-desk"],
    label: "Getting ready to arrive",
  },
  "getting-there": {
    suggestedFilterId: "access",
    preferredTypes: ["drop-off", "accessible-parking", "parking", "entrance", "help-desk"],
    label: "Arrival route",
  },
  "when-you-arrive": {
    suggestedFilterId: "help",
    preferredTypes: ["entrance", "help-desk", "lift", "stairs"],
    label: "Arrival and wayfinding",
  },
  "the-space": {
    suggestedFilterId: "quiet",
    preferredTypes: ["quiet-room", "seating", "prayer-room", "help-desk"],
    label: "Calmer spaces",
  },
  "what-to-do": {
    suggestedFilterId: "all",
    preferredTypes: ["entrance", "seating", "help-desk", "cafeteria"],
    label: "Main spaces",
  },
  "eating-drinking": {
    suggestedFilterId: "food",
    preferredTypes: ["cafeteria", "water-fountain", "seating"],
    label: "Food and drink",
  },
  "if-overwhelmed": {
    suggestedFilterId: "quiet",
    preferredTypes: ["quiet-room", "exit", "help-desk", "first-aid", "seating"],
    label: "Support and exit options",
  },
  "getting-home": {
    suggestedFilterId: "help",
    preferredTypes: ["exit", "drop-off", "parking", "accessible-parking", "entrance"],
    label: "Leaving the venue",
  },
};

export function getSectionMapConfig(sectionId?: string | null) {
  return (sectionId ? SECTION_MAP_CONFIG[sectionId] : undefined) ?? SECTION_MAP_CONFIG["when-you-arrive"];
}

function scoreFacilityByProfile(facility: Facility, profile?: SensoryProfile) {
  if (!profile) return 0;

  let score = 0;

  if ((profile.needsMobilityAccess || profile.usesMobilityAid) && facility.type === "lift") score += 6;
  if ((profile.needsMobilityAccess || profile.usesMobilityAid) && facility.type === "stairs") score -= 8;
  if (profile.needsAccessibleToilet && facility.type === "accessible-toilet") score += 8;
  if (profile.needsQuietSpace && ["quiet-room", "prayer-room", "seating"].includes(facility.type)) score += 6;
  if (profile.crowdSensitivity === "high" && ["quiet-room", "prayer-room", "exit"].includes(facility.type)) score += 4;
  if (profile.soundSensitivity === "high" && ["quiet-room", "prayer-room"].includes(facility.type)) score += 4;
  if (profile.hasMedicalNeeds && facility.type === "first-aid") score += 4;

  return score;
}

export function sortFacilitiesForMap(
  facilities: Facility[],
  sectionId?: string | null,
  profile?: SensoryProfile
) {
  const config = getSectionMapConfig(sectionId);

  return [...facilities].sort((a, b) => {
    const aPreferred = config.preferredTypes.indexOf(a.type);
    const bPreferred = config.preferredTypes.indexOf(b.type);

    const aPreferredScore = aPreferred === -1 ? 0 : config.preferredTypes.length - aPreferred;
    const bPreferredScore = bPreferred === -1 ? 0 : config.preferredTypes.length - bPreferred;

    const aScore = aPreferredScore * 10 + scoreFacilityByProfile(a, profile) + (a.location ? 1 : 0);
    const bScore = bPreferredScore * 10 + scoreFacilityByProfile(b, profile) + (b.location ? 1 : 0);

    return bScore - aScore;
  });
}

export function buildRouteSummary(
  selectedFacility: Facility | undefined,
  venueName: string,
  profile?: SensoryProfile,
  sectionId?: string | null
) {
  const config = getSectionMapConfig(sectionId);

  const emphasis = profile?.needsMobilityAccess || profile?.usesMobilityAid
    ? "Step-free route"
    : profile?.routePreference === "quietest" || profile?.crowdSensitivity === "high" || profile?.soundSensitivity === "high"
      ? "Calmer route"
      : profile?.routePreference === "fastest"
        ? "Fastest route"
        : "Balanced route";

  const steps = [
    `Start at the main entrance for ${venueName}.`,
    profile?.needsMobilityAccess || profile?.usesMobilityAid
      ? "Stay on the step-free route and use lifts where available."
      : profile?.routePreference === "quietest" || profile?.crowdSensitivity === "high"
        ? "Follow the quieter highlighted path and pause at calmer spaces if needed."
        : "Follow the highlighted path to your selected feature.",
    selectedFacility
      ? `Head to ${selectedFacility.label}${selectedFacility.floor ? ` on ${selectedFacility.floor}` : ""}.`
      : `Look for the next key feature highlighted for ${config.label.toLowerCase()}.`,
  ];

  if (selectedFacility?.description) {
    steps.push(selectedFacility.description);
  } else if (selectedFacility?.notes) {
    steps.push(selectedFacility.notes);
  }

  return {
    emphasis,
    sectionLabel: config.label,
    steps,
  };
}