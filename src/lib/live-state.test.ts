import { describe, expect, it } from "vitest";
import { deriveLiveVenueState } from "./live-state";

describe("deriveLiveVenueState", () => {
  it("marks closes_soon when venue is open and closes within an hour", () => {
    const now = new Date("2026-06-12T16:30:00.000Z");
    const state = deriveLiveVenueState({
      now,
      providerOpenNow: true,
      venueData: {
        openingHours: { friday: "9:00-17:00" },
        peakTimes: "weekday lunch",
        quietTimes: "weekday mornings",
      },
    });

    expect(state.openStatus).toBe("closes_soon");
    expect(state.nextChangeAt).toBeDefined();
  });

  it("marks special_closure when live updates report closure", () => {
    const state = deriveLiveVenueState({
      now: new Date("2026-06-12T03:00:00.000Z"),
      providerOpenNow: true,
      venueData: {
        liveUpdates: ["Temporarily closed today for private event"],
      },
    });

    expect(state.openStatus).toBe("special_closure");
    expect(state.specialClosureNote).toContain("Special closure");
  });

  it("adds rainy weather recommendation", () => {
    const state = deriveLiveVenueState({
      now: new Date("2026-06-12T03:00:00.000Z"),
      providerOpenNow: true,
      venueData: {},
      weather: { condition: "Heavy rain", tempC: 19 },
    });

    expect(state.weatherRecommendation).toContain("Rainy");
  });
});
