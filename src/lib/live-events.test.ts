import { describe, expect, it } from "vitest";
import { detectLiveVenueEvent } from "./live-events";

describe("detectLiveVenueEvent", () => {
  it("emits open status event for first snapshot", () => {
    const event = detectLiveVenueEvent(null, {
      openStatus: "open",
      busynessLevel: "moderate",
    });

    expect(event?.eventType).toBe("open_status_changed");
  });

  it("emits special closure event when venue becomes special_closure", () => {
    const event = detectLiveVenueEvent(
      { openStatus: "open", busynessLevel: "busy" },
      { openStatus: "special_closure", busynessLevel: "quiet", specialClosureNote: "Private event" }
    );

    expect(event?.eventType).toBe("special_closure");
    expect(event?.body).toContain("Private event");
  });

  it("emits busyness event when busyness changes", () => {
    const event = detectLiveVenueEvent(
      { openStatus: "open", busynessLevel: "quiet" },
      { openStatus: "open", busynessLevel: "very_busy" }
    );

    expect(event?.eventType).toBe("busyness_changed");
  });

  it("returns null when no significant changes happened", () => {
    const event = detectLiveVenueEvent(
      { openStatus: "open", busynessLevel: "moderate" },
      { openStatus: "open", busynessLevel: "moderate" }
    );

    expect(event).toBeNull();
  });
});
