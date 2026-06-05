/**
 * Transport NSW Open Data API
 * Register at: https://opendata.transport.nsw.gov.au/
 * Documentation: https://opendata.transport.nsw.gov.au/dataset/trip-planner-apis
 */

const TRANSPORT_NSW_BASE = "https://api.transport.nsw.gov.au/v1/tp";

export interface TripPlanRequest {
  originName: string; // suburb or address
  destinationAddress: string; // venue address
  date: string; // YYYYMMDD
  time: string; // HHMM
  arriveBy?: boolean;
}

export interface TripLeg {
  mode: string;
  lineName?: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  platform?: string;
  accessibility?: string;
  stopSequence?: { name: string; time: string }[];
}

export interface TripPlanResult {
  legs: TripLeg[];
  totalDurationMinutes: number;
  departureTime: string;
  arrivalTime: string;
  isAccessible: boolean;
}

/**
 * Get trip plan from Transport NSW API.
 * Returns null if the API key is missing (graceful degradation).
 */
export async function getTripPlan(
  req: TripPlanRequest
): Promise<TripPlanResult | null> {
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
    wheelchair: "on",
  });

  const res = await fetch(`${TRANSPORT_NSW_BASE}/trip?${params}`, {
    headers: { Authorization: `apikey ${apiKey}` },
  });

  if (!res.ok) return null;

  const data = await res.json();
  const journey = data.journeys?.[0];
  if (!journey) return null;

  const legs: TripLeg[] = (journey.legs ?? []).map(
    (leg: {
      transportation?: { product?: { name?: string }; number?: string; name?: string };
      origin?: { name?: string; departureTimePlanned?: string };
      destination?: { name?: string; arrivalTimePlanned?: string };
    }) => {
      const depTime = leg.origin?.departureTimePlanned ?? "";
      const arrTime = leg.destination?.arrivalTimePlanned ?? "";
      const dep = depTime ? new Date(depTime) : new Date();
      const arr = arrTime ? new Date(arrTime) : new Date();
      const durationMinutes = Math.round((arr.getTime() - dep.getTime()) / 60000);

      return {
        mode: leg.transportation?.product?.name ?? "walk",
        lineName: leg.transportation?.number ?? leg.transportation?.name,
        from: leg.origin?.name ?? "",
        to: leg.destination?.name ?? "",
        departureTime: depTime,
        arrivalTime: arrTime,
        durationMinutes,
        accessibility: "Accessible",
      };
    }
  );

  const firstDep = legs[0]?.departureTime ?? "";
  const lastArr = legs[legs.length - 1]?.arrivalTime ?? "";
  const totalMinutes = legs.reduce((sum, l) => sum + l.durationMinutes, 0);

  return {
    legs,
    totalDurationMinutes: totalMinutes,
    departureTime: firstDep,
    arrivalTime: lastArr,
    isAccessible: true,
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
