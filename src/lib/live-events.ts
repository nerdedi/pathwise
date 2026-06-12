import type { LiveVenueState } from "@/types/venue";

export type LiveVenueEventType =
  | "open_status_changed"
  | "busyness_changed"
  | "special_closure"
  | "weather_recommendation";

export interface LiveVenueEvent {
  eventType: LiveVenueEventType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
}

function differs(a: unknown, b: unknown) {
  return (a ?? null) !== (b ?? null);
}

export function detectLiveVenueEvent(
  previous: Partial<LiveVenueState> | null,
  next: Partial<LiveVenueState>
): LiveVenueEvent | null {
  if (!previous) {
    return {
      eventType: "open_status_changed",
      title: "Live status available",
      body: "Live venue status is now being tracked for this venue.",
      payload: {
        previous: null,
        next,
      },
    };
  }

  if (next.openStatus === "special_closure" && previous.openStatus !== "special_closure") {
    return {
      eventType: "special_closure",
      title: "Temporary closure update",
      body: next.specialClosureNote || "A temporary closure or disruption was reported.",
      payload: {
        previousOpenStatus: previous.openStatus,
        nextOpenStatus: next.openStatus,
        specialClosureNote: next.specialClosureNote,
      },
    };
  }

  if (differs(previous.openStatus, next.openStatus)) {
    const label = String(next.openStatus ?? "status changed").replace(/_/g, " ");
    return {
      eventType: "open_status_changed",
      title: "Venue status changed",
      body: `Venue is now ${label}.`,
      payload: {
        previousOpenStatus: previous.openStatus,
        nextOpenStatus: next.openStatus,
        nextChangeAt: next.nextChangeAt,
      },
    };
  }

  if (differs(previous.busynessLevel, next.busynessLevel)) {
    const label = String(next.busynessLevel ?? "updated").replace(/_/g, " ");
    return {
      eventType: "busyness_changed",
      title: "Busyness changed",
      body: `Current busyness is now ${label}.`,
      payload: {
        previousBusynessLevel: previous.busynessLevel,
        nextBusynessLevel: next.busynessLevel,
      },
    };
  }

  if (
    next.weatherRecommendation &&
    differs(previous.weatherRecommendation, next.weatherRecommendation)
  ) {
    return {
      eventType: "weather_recommendation",
      title: "Weather-aware suggestion",
      body: next.weatherRecommendation,
      payload: {
        weatherRecommendation: next.weatherRecommendation,
      },
    };
  }

  return null;
}
