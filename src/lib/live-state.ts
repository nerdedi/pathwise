import type {
    LiveBusynessLevel,
    LiveOpenStatus,
    LiveVenueState,
    VenueData,
} from "@/types/venue";

const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function normalizeHourText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseHourToken(token: string) {
  const normalized = normalizeHourText(token).replace(/\./g, "");
  const match = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const suffix = match[3];

  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;

  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function parseHoursRange(hoursText: string | undefined, now: Date) {
  if (!hoursText) return null;
  const normalized = normalizeHourText(hoursText);
  if (normalized.includes("closed")) {
    return { openAt: null, closeAt: null };
  }

  const parts = normalized.split(/-|–|to/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const start = parseHourToken(parts[0]);
  const end = parseHourToken(parts[1]);
  if (!start || !end) return null;

  const openAt = new Date(now);
  openAt.setHours(start.hour, start.minute, 0, 0);

  const closeAt = new Date(now);
  closeAt.setHours(end.hour, end.minute, 0, 0);

  if (closeAt <= openAt) {
    closeAt.setDate(closeAt.getDate() + 1);
  }

  return { openAt, closeAt };
}

function pickTodaysHours(openingHours: VenueData["openingHours"] | undefined, now: Date) {
  if (!openingHours || typeof openingHours !== "object") return undefined;
  const dayKey = WEEKDAY_KEYS[now.getDay()];

  return (
    openingHours[dayKey] ??
    openingHours[dayKey.slice(0, 3)] ??
    openingHours[dayKey.charAt(0).toUpperCase() + dayKey.slice(1)]
  );
}

function isSpecialClosure(liveUpdates: string[] | undefined) {
  const updates = (liveUpdates ?? []).join(" ").toLowerCase();
  return updates.includes("closed") || updates.includes("private event") || updates.includes("refit") || updates.includes("renovation");
}

function weatherRecommendation(weather: { condition?: string; tempC?: number } | undefined) {
  const condition = (weather?.condition ?? "").toLowerCase();
  const tempC = weather?.tempC;

  if (condition.includes("rain") || condition.includes("storm")) {
    return "Rainy right now — indoor areas are likely more comfortable.";
  }

  if (typeof tempC === "number" && tempC >= 30) {
    return "It’s hot right now — look for air-conditioned or shaded spaces.";
  }

  if (typeof tempC === "number" && tempC <= 8) {
    return "It’s cold outside — warm indoor spots and hot drinks can help.";
  }

  return undefined;
}

function deriveBusynessLevel(params: {
  peakTimes?: unknown;
  quietTimes?: unknown;
  now: Date;
  openNow: boolean;
}): LiveBusynessLevel {
  if (!params.openNow) return "quiet";

  const hour = params.now.getHours();
  const peak = Array.isArray(params.peakTimes)
    ? params.peakTimes.join(" ").toLowerCase()
    : typeof params.peakTimes === "string"
      ? params.peakTimes.toLowerCase()
      : "";
  const quiet = Array.isArray(params.quietTimes)
    ? params.quietTimes.join(" ").toLowerCase()
    : typeof params.quietTimes === "string"
      ? params.quietTimes.toLowerCase()
      : "";

  if ((peak.includes("weekend") && [0, 6].includes(params.now.getDay())) || (hour >= 12 && hour <= 14) || (hour >= 17 && hour <= 19)) {
    return peak.includes("very") || peak.includes("extreme") ? "very_busy" : "busy";
  }

  if (quiet.includes("morning") && hour < 11) return "quiet";
  if (quiet.includes("weekday") && ![0, 6].includes(params.now.getDay())) return "quiet";

  return "moderate";
}

export function deriveLiveVenueState(params: {
  venueData: Partial<VenueData>;
  providerOpenNow?: boolean;
  weather?: { condition?: string; tempC?: number };
  now?: Date;
  source?: LiveVenueState["source"];
}): LiveVenueState {
  const now = params.now ?? new Date();
  const liveUpdates = params.venueData.liveUpdates ?? [];
  const specialClosure = isSpecialClosure(liveUpdates);

  const todaysHours = pickTodaysHours(params.venueData.openingHours, now);
  const parsedRange = parseHoursRange(todaysHours, now);

  const openNowByHours = Boolean(
    parsedRange?.openAt &&
      parsedRange.closeAt &&
      now >= parsedRange.openAt &&
      now < parsedRange.closeAt
  );

  const providerOpenNow = params.providerOpenNow;
  const openNow = typeof providerOpenNow === "boolean" ? providerOpenNow : openNowByHours;

  const nextChangeAt = openNow
    ? parsedRange?.closeAt?.toISOString()
    : parsedRange?.openAt?.toISOString();

  const closesSoon = openNow && parsedRange?.closeAt
    ? parsedRange.closeAt.getTime() - now.getTime() <= 60 * 60 * 1000
    : false;

  const openStatus: LiveOpenStatus = specialClosure
    ? "special_closure"
    : openNow
      ? closesSoon
        ? "closes_soon"
        : "open"
      : "closed";

  const busynessLevel = deriveBusynessLevel({
    peakTimes: params.venueData.peakTimes,
    quietTimes: params.venueData.quietTimes,
    now,
    openNow,
  });

  return {
    busynessLevel,
    openStatus,
    nextChangeAt,
    updatedAt: now.toISOString(),
    source: params.source ?? "derived",
    confidence: typeof providerOpenNow === "boolean" ? 80 : 60,
    specialClosureNote: specialClosure
      ? "Special closure or temporary disruption reported."
      : undefined,
    weatherRecommendation: weatherRecommendation(params.weather),
  };
}

export function describeBusyness(level: LiveBusynessLevel) {
  switch (level) {
    case "quiet":
      return "Quiet";
    case "moderate":
      return "Moderate";
    case "busy":
      return "Busy";
    case "very_busy":
      return "Very busy";
    default:
      return "Moderate";
  }
}

export function busynessPercent(level: LiveBusynessLevel) {
  switch (level) {
    case "quiet":
      return 25;
    case "moderate":
      return 50;
    case "busy":
      return 75;
    case "very_busy":
      return 95;
    default:
      return 50;
  }
}
