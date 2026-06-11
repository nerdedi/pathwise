import type { TransportPlan } from "@/types/itinerary";
import { describe, expect, it } from "vitest";
import {
    buildAlternativeRouteOptions,
    buildPostTransitWalkingGuidance,
    buildPreTripAlerts,
    buildTransportSupportCards,
    buildTripOptimisationTips,
} from "./transport-support";

const makePlan = (overrides: Partial<TransportPlan> = {}): TransportPlan => ({
  fromSuburb: "Parramatta",
  toVenue: "Museum of Sydney",
  totalDurationMinutes: 42,
  totalApproximateSteps: 1800,
  accessibleRoute: true,
  notes: "",
  legs: [
    {
      mode: "walk",
      from: "Home",
      to: "Parramatta Station",
      departureTime: "08:00",
      arrivalTime: "08:08",
      durationMinutes: 8,
    },
    {
      mode: "train",
      from: "Parramatta Station",
      to: "Wynyard",
      departureTime: "08:10",
      arrivalTime: "08:40",
      durationMinutes: 30,
      crowdingLevel: "high",
      disruptionInfo: "Track work after 9pm",
    },
  ],
  ...overrides,
});

describe("buildTransportSupportCards", () => {
  it("returns cards in ranked order", () => {
    const cards = buildTransportSupportCards(makePlan(), {
      venueName: "Museum of Sydney",
      direction: "to",
      emergencyContacts: [{ name: "Sam", phone: "0400000000" }],
    });

    expect(cards).toHaveLength(8);
    expect(cards[0].id).toBe("first-last-mile");
    expect(cards[1].id).toBe("stop-alert");
    expect(cards[7].id).toBe("panic-help");
  });

  it("uses emergency contact in panic support card", () => {
    const cards = buildTransportSupportCards(makePlan(), {
      venueName: "Museum of Sydney",
      direction: "to",
      emergencyContacts: [{ name: "Alex", phone: "0411111111" }],
    });

    expect(cards.find((card) => card.id === "panic-help")?.detail).toContain("Alex");
  });

  it("falls back to support card message when no emergency contact exists", () => {
    const cards = buildTransportSupportCards(makePlan(), {
      venueName: "Museum of Sydney",
      direction: "to",
      supportCardName: "Support pass",
      supportCardMessage: "Please give me simple instructions.",
      emergencyContacts: [],
    });

    expect(cards.find((card) => card.id === "panic-help")?.detail).toContain("Support pass");
  });

  it("uses live update text when available", () => {
    const cards = buildTransportSupportCards(
      makePlan({
        liveUpdates: ["Train delayed by 4 minutes"],
      }),
      {
        venueName: "Museum of Sydney",
        direction: "to",
      }
    );

    expect(cards.find((card) => card.id === "live-eta")?.detail).toContain("delayed");
  });

  it("builds pre-trip alerts with station guidance", () => {
    const alerts = buildPreTripAlerts(makePlan(), "Museum of Sydney");

    expect(alerts).toHaveLength(3);
    expect(alerts[0].id).toBe("pack-bag");
    expect(alerts[2].detail).toContain("Parramatta Station");
  });

  it("returns disruption alternatives", () => {
    const alternatives = buildAlternativeRouteOptions(makePlan());

    expect(alternatives.length).toBeGreaterThanOrEqual(2);
    expect(alternatives.some((item) => item.id === "reroute-now")).toBe(true);
  });

  it("builds post-transit walking guidance", () => {
    const walking = buildPostTransitWalkingGuidance(makePlan(), "to", "Museum of Sydney");

    expect(walking[0].title).toContain("walking");
    expect(walking.length).toBeGreaterThan(1);
  });

  it("builds optimisation insights from trip memories", () => {
    const tips = buildTripOptimisationTips(makePlan(), [
      { recordedAt: "2026-06-01", stressScore: 8, crowdingLevel: "high" },
      { recordedAt: "2026-06-02", stressScore: 7, crowdingLevel: "high" },
      { recordedAt: "2026-06-03", stressScore: 5, crowdingLevel: "medium" },
    ]);

    expect(tips.some((tip) => tip.id === "stress-trend")).toBe(true);
    expect(tips.some((tip) => tip.id.includes("optimize"))).toBe(true);
  });

  it("falls back gracefully when plan legs are missing", () => {
    const cards = buildTransportSupportCards(
      makePlan({
        legs: [],
        liveUpdates: [],
        reminders: [],
        journeyReminder: undefined,
      }),
      {
        venueName: "Museum of Sydney",
        direction: "from",
      }
    );

    expect(cards.find((card) => card.id === "first-last-mile")?.detail).toContain("Follow signs to the first stop");
    expect(cards.find((card) => card.id === "stop-alert")?.detail).toContain("Track your stop");
    expect(cards.find((card) => card.id === "live-eta")?.detail).toContain("Check live vehicle location");
    expect(cards.find((card) => card.id === "panic-help")?.detail).toContain("trusted person quickly");
  });

  it("uses quiet-route and reminder fallbacks when no high-crowding or disruption leg exists", () => {
    const cards = buildTransportSupportCards(
      makePlan({
        routePreference: "quietest",
        legs: [
          {
            mode: "walk",
            from: "Home",
            to: "Stop",
            departureTime: "08:00",
            arrivalTime: "08:05",
            durationMinutes: 5,
          },
          {
            mode: "bus",
            from: "Stop",
            to: "Town Hall",
            departureTime: "08:10",
            arrivalTime: "08:35",
            durationMinutes: 25,
            crowdingLevel: "low",
          },
        ],
        reminders: ["Bring your headphones."],
      }),
      {
        venueName: "Museum of Sydney",
        direction: "to",
        supportCardName: "Support card",
        supportCardMessage: "Please help me find a quiet route.",
      }
    );

    expect(cards.find((card) => card.id === "crowding")?.detail).toContain("prefers quieter services");
    expect(cards.find((card) => card.id === "change-trip")?.detail).toContain("pause and recalculate");
    expect(cards.find((card) => card.id === "trip-prep")?.detail).toContain("Bring your headphones.");
    expect(cards.find((card) => card.id === "panic-help")?.detail).toContain("Support card");
  });

  it("builds fallback pre-trip alerts when no legs are available", () => {
    const alerts = buildPreTripAlerts(makePlan({ legs: [] }), "Museum of Sydney");

    expect(alerts[1].detail).toContain("Set a leave-now alarm");
    expect(alerts[2].detail).toContain("nearest station or stop");
  });

  it("returns minimal alternative options when route is already quiet and undisrupted", () => {
    const alternatives = buildAlternativeRouteOptions(
      makePlan({
        routePreference: "quietest",
        legs: [
          {
            mode: "train",
            from: "A",
            to: "B",
            departureTime: "08:00",
            arrivalTime: "08:20",
            durationMinutes: 20,
            crowdingLevel: "low",
          },
        ],
      })
    );

    expect(alternatives).toHaveLength(1);
    expect(alternatives[0]?.id).toBe("accessibility-route");
  });

  it("builds no-walk fallback guidance and no-memory optimisation baseline", () => {
    const walking = buildPostTransitWalkingGuidance(
      makePlan({
        legs: [
          {
            mode: "train",
            from: "Central",
            to: "Museum",
            departureTime: "09:00",
            arrivalTime: "09:20",
            durationMinutes: 20,
          },
        ],
      }),
      "from",
      "Museum of Sydney"
    );

    expect(walking).toHaveLength(1);
    expect(walking[0]?.detail).toContain("Museum of Sydney");

    const tips = buildTripOptimisationTips(makePlan(), []);
    expect(tips).toHaveLength(1);
    expect(tips[0]?.id).toBe("optimize-baseline");
  });

  it("uses maintain-plan optimisation when average stress is low", () => {
    const tips = buildTripOptimisationTips(makePlan({ routePreference: "balanced" }), [
      { recordedAt: "2026-06-01", stressScore: 3, crowdingLevel: "low" },
      { recordedAt: "2026-06-02", stressScore: 4, crowdingLevel: "medium" },
    ]);

    expect(tips.some((tip) => tip.id === "optimize-maintain")).toBe(true);
    expect(tips.some((tip) => tip.id === "optimize-calm-route")).toBe(false);
  });
});
