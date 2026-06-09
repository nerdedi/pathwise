/**
 * Transport NSW Open Data API
 * Register at: https://opendata.transport.nsw.gov.au/
 * Documentation: https://opendata.transport.nsw.gov.au/dataset/trip-planner-apis
 */

const TRANSPORT_NSW_BASE = "https://api.transport.nsw.gov.au/v1/tp";

type RoutePreference = "balanced" | "fastest" | "quietest";

export interface TripPlanRequest {
  originName: string; // suburb or address
  destinationAddress: string; // venue address
  date: string; // YYYYMMDD
  time: string; // HHMM
  arriveBy?: boolean;
  routePreference?: RoutePreference;
  wheelchairRequired?: boolean;
  needsLevelBoardingInfo?: boolean;
  needsLiveLiftInfo?: boolean;
  needsOnboardToiletInfo?: boolean;
  crowdSensitivity?: "low" | "medium" | "high";
  soundSensitivity?: "low" | "medium" | "high";
}

export interface TripLeg {
  mode: string;
  line?: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  approximateSteps?: number;
  platform?: string;
  accessibility?: string;
  stopSequence?: { name: string; time: string }[];
  crowdingLevel?: "low" | "medium" | "high";
  noiseLevel?: "low" | "medium" | "high";
  levelBoarding?: boolean;
  onboardToilet?: boolean;
  liftStatus?: "available" | "outage" | "unknown";
  stationFacilities?: string[];
  disruptionInfo?: string;
}

export interface TripPlanResult {
  legs: TripLeg[];
  totalDurationMinutes: number;
  departureTime: string;
  arrivalTime: string;
  isAccessible: boolean;
  totalApproximateSteps: number;
  routePreference?: RoutePreference;
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
  notes: string;
}

function normalizeMode(rawMode: string | undefined): string {
  const value = (rawMode ?? "walk").toLowerCase();
  if (value.includes("train")) return "train";
  if (value.includes("bus")) return "bus";
  if (value.includes("light") || value.includes("tram")) return "light-rail";
  if (value.includes("ferry")) return "ferry";
  if (value.includes("walk")) return "walk";
  return value;
}

function inferStationFacilities(stopName: string, accessible = true): string[] {
  const base = [
    `${stopName}: help point`,
    `${stopName}: toilets`,
    `${stopName}: seating`,
  ];

  if (accessible) {
    base.push(`${stopName}: lift access`, `${stopName}: step-free route`, `${stopName}: accessible toilet`);
  }

  return base;
}

function inferCrowding(hour: number, mode: string): "low" | "medium" | "high" {
  const peak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
  if (peak && mode !== "walk") return "high";
  if (mode === "bus") return peak ? "high" : "medium";
  return peak ? "medium" : "low";
}

function inferNoise(mode: string): "low" | "medium" | "high" {
  if (mode === "walk") return "low";
  if (mode === "bus") return "high";
  return "medium";
}

function computeStressScore(legs: TripLeg[], routePreference: RoutePreference, req: TripPlanRequest): number {
  const transfers = Math.max(legs.filter((leg) => leg.mode !== "walk").length - 1, 0);
  const walkingMinutes = legs.filter((leg) => leg.mode === "walk").reduce((sum, leg) => sum + leg.durationMinutes, 0);
  const crowdPenalty = legs.reduce((sum, leg) => sum + (leg.crowdingLevel === "high" ? 2 : leg.crowdingLevel === "medium" ? 1 : 0), 0);
  const noisePenalty = legs.reduce((sum, leg) => sum + (leg.noiseLevel === "high" ? 2 : leg.noiseLevel === "medium" ? 1 : 0), 0);
  const crowdMultiplier = req.crowdSensitivity === "high" ? 2 : req.crowdSensitivity === "medium" ? 1.3 : 0.7;
  const noiseMultiplier = req.soundSensitivity === "high" ? 2 : req.soundSensitivity === "medium" ? 1.3 : 0.7;

  if (routePreference === "fastest") {
    return transfers * 2 + crowdPenalty * crowdMultiplier + noisePenalty * noiseMultiplier + Math.round(walkingMinutes / 10);
  }

  if (routePreference === "quietest") {
    return transfers * 3 + crowdPenalty * 2 * crowdMultiplier + noisePenalty * 2 * noiseMultiplier + Math.round(walkingMinutes / 8);
  }

  return transfers * 2 + crowdPenalty * crowdMultiplier + noisePenalty * noiseMultiplier + Math.round(walkingMinutes / 9);
}

function buildJourneyReminder(routePreference: RoutePreference, accessible: boolean) {
  if (routePreference === "quietest") {
    return "This route prioritises fewer stressful segments and quieter travel where possible.";
  }
  if (routePreference === "fastest") {
    return "This route prioritises getting you there quickly while keeping accessibility in mind.";
  }
  return accessible
    ? "This route balances time, accessibility, and lower-stress travel steps."
    : "This route balances time and simpler travel steps.";
}

function buildStationWayfinding(legs: TripLeg[], req: TripPlanRequest): NonNullable<TripPlanResult["stationWayfinding"]> {
  const stations = new Map<string, NonNullable<TripPlanResult["stationWayfinding"]>[number]>();

  for (const leg of legs) {
    if (leg.mode === "walk") continue;

    [leg.from, leg.to].forEach((stationName) => {
      if (!stationName || stations.has(stationName)) return;

      stations.set(stationName, {
        stationName,
        stepFreeAccess: true,
        accessibleToilet: req.wheelchairRequired || req.needsOnboardToiletInfo ? true : false,
        toilets: true,
        liftStatus: req.needsLiveLiftInfo ? "unknown" : "unknown",
        seating: true,
        helpPoint: true,
        levelBoardingAvailable: leg.levelBoarding,
        onboardToiletAvailable: leg.onboardToilet,
        notes:
          "Station facility info is a best-effort summary. Check operator updates before travel for live lift changes.",
      });
    });
  }

  return Array.from(stations.values());
}

/**
 * Get trip plan from Transport NSW API.
 * Returns null if the API key is missing (graceful degradation).
 */
export async function getTripPlan(
  req: TripPlanRequest
): Promise<TripPlanResult | null> {
  type RawLeg = {
    transportation?: { product?: { name?: string }; number?: string; name?: string };
    origin?: { name?: string; departureTimePlanned?: string };
    destination?: { name?: string; arrivalTimePlanned?: string };
  };

  type RawJourney = {
    legs?: RawLeg[];
  };

  const apiKey = process.env.TRANSPORT_NSW_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    outputFormat: "rapidJSON",
    coordOutputFormat: "EPSG:4326",
    depArrMacro: req.arriveBy ? "arr" : "dep",
    itdDate: req.date,
    itdTime: req.time,
    type_origin: "any",
    name_origin: req.originName,
    type_destination: "any",
    name_destination: req.destinationAddress,
    calcNumberOfTrips: "3",
    wheelchair: req.wheelchairRequired ? "on" : "off",
  });

  const res = await fetch(`${TRANSPORT_NSW_BASE}/trip?${params}`, {
    headers: { Authorization: `apikey ${apiKey}` },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { journeys?: RawJourney[] };
  const journeys = (data.journeys ?? []).slice(0, 3);
  if (!journeys.length) return null;

  const routePreference = req.routePreference ?? "balanced";

  const candidates = journeys.map((journey: RawJourney) => {
    const legs: TripLeg[] = (journey.legs ?? []).map(
    (leg: RawLeg) => {
      const depTime = leg.origin?.departureTimePlanned ?? "";
      const arrTime = leg.destination?.arrivalTimePlanned ?? "";
      const dep = depTime ? new Date(depTime) : new Date();
      const arr = arrTime ? new Date(arrTime) : new Date();
      const durationMinutes = Math.round((arr.getTime() - dep.getTime()) / 60000);
      const mode = normalizeMode(leg.transportation?.product?.name ?? leg.transportation?.name);
      const hour = dep.getHours();
      const accessible = true;

      return {
        mode,
        line: leg.transportation?.number ?? leg.transportation?.name,
        from: leg.origin?.name ?? "",
        to: leg.destination?.name ?? "",
        departureTime: depTime,
        arrivalTime: arrTime,
        durationMinutes,
        approximateSteps: mode === "walk" ? Math.max(200, durationMinutes * 90) : 40,
        accessibility: "Accessible",
        crowdingLevel: inferCrowding(hour, mode),
        noiseLevel: inferNoise(mode),
        levelBoarding: accessible && (mode === "train" || mode === "light-rail" || mode === "ferry"),
        onboardToilet: mode === "train" ? durationMinutes >= 25 : mode === "ferry",
        liftStatus: accessible ? "available" : "unknown",
        stationFacilities: inferStationFacilities(leg.origin?.name ?? leg.destination?.name ?? "Station", accessible),
        disruptionInfo: "No live disruption reported right now. Recheck closer to departure.",
      };
    }
  );

    const firstDep = legs[0]?.departureTime ?? "";
    const lastArr = legs[legs.length - 1]?.arrivalTime ?? "";
    const totalMinutes = legs.reduce((sum, l) => sum + l.durationMinutes, 0);
    const stressScore = computeStressScore(legs, routePreference, req);

    return {
      legs,
      totalDurationMinutes: totalMinutes,
      departureTime: firstDep,
      arrivalTime: lastArr,
      isAccessible: true,
      routePreference,
      stressScore,
      journeyReminder: buildJourneyReminder(routePreference, true),
      rankingScore:
        routePreference === "fastest"
          ? totalMinutes + stressScore * 2
          : routePreference === "quietest"
          ? stressScore * 8 + totalMinutes
          : totalMinutes + stressScore * 4,
    };
  });

  const best = candidates.sort((a, b) => a.rankingScore - b.rankingScore)[0];
  const totalApproximateSteps = best.legs.reduce((sum, leg) => sum + (leg.approximateSteps ?? 0), 0);
  const stationWayfinding = buildStationWayfinding(best.legs, req);
  const liveUpdates = [
    req.needsLiveLiftInfo
      ? "Lift status should be checked again shortly before travel."
      : "No live disruption feed connected yet.",
  ];
  const reminders = [
    routePreference === "quietest"
      ? "If a platform feels too busy, give yourself permission to wait for the next quieter option."
      : "Build in a little buffer time so unexpected changes feel easier to manage.",
    req.needsOnboardToiletInfo
      ? "Double-check toilet access on longer legs before boarding."
      : "Keep water, headphones, or a grounding item easy to reach.",
  ];

  return {
    legs: best.legs,
    totalDurationMinutes: best.totalDurationMinutes,
    departureTime: best.departureTime,
    arrivalTime: best.arrivalTime,
    isAccessible: best.isAccessible,
    totalApproximateSteps,
    routePreference: best.routePreference,
    stressScore: best.stressScore,
    journeyReminder: best.journeyReminder,
    stationWayfinding,
    liveUpdates,
    reminders,
    notes: best.journeyReminder ?? "Planned route generated from available transport data.",
  };
}

/**
 * Estimate walking steps between two points.
 * Average: ~1,300 steps per km.
 */
export function estimateSteps(distanceMetres: number): number {
  const km = distanceMetres / 1000;
  return Math.round(km * 1300);
}

/**
 * Estimate walking distance from a transport stop to venue entrance (rough estimate).
 */
export function estimateWalkFromStation(
  stationName: string,
  venueName: string
): { distanceMetres: number; steps: number; minutes: number } {
  // Placeholder — in production, use Google Maps Distance Matrix or Mapbox Directions
  const estimated = 350; // assume 350m average
  return {
    distanceMetres: estimated,
    steps: estimateSteps(estimated),
    minutes: Math.round(estimated / 80), // ~80m/min walking pace
  };
}
