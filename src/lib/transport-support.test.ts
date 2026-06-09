import type { TransportPlan } from "@/types/itinerary";
import { describe, expect, it } from "vitest";
import { buildTransportSupportCards } from "./transport-support";

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
});
