import { afterEach, describe, expect, it, vi } from "vitest";
import {
    estimateSteps,
    estimateWalkFromStation,
    getTripPlan,
} from "./transport-nsw";

describe("transport-nsw helpers", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.TRANSPORT_NSW_API_KEY;
  const originalMapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.TRANSPORT_NSW_API_KEY = originalApiKey;
    process.env.MAPBOX_ACCESS_TOKEN = originalMapboxToken;
    vi.restoreAllMocks();
  });

  it("calculates walking steps", () => {
    expect(estimateSteps(1000)).toBe(1300);
    expect(estimateSteps(350)).toBeGreaterThan(400);
  });

  it("returns null trip plan when transport API key is missing", async () => {
    delete process.env.TRANSPORT_NSW_API_KEY;

    const plan = await getTripPlan({
      originName: "Parramatta",
      destinationAddress: "Sydney Opera House",
      date: "20260611",
      time: "1030",
    });

    expect(plan).toBeNull();
  });

  it("adds live freshness metadata to trip plans", async () => {
    process.env.TRANSPORT_NSW_API_KEY = "test-key";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        journeys: [
          {
            legs: [
              {
                transportation: { product: { name: "train" }, number: "T1" },
                origin: { name: "Parramatta", departureTimePlanned: "2026-06-11T10:30:00+10:00" },
                destination: { name: "Town Hall", arrivalTimePlanned: "2026-06-11T11:00:00+10:00" },
              },
            ],
          },
        ],
      }),
    });

    global.fetch = fetchMock as typeof fetch;

    const plan = await getTripPlan({
      originName: "Parramatta",
      destinationAddress: "Sydney Opera House",
      date: "20260611",
      time: "1030",
      needsLiveLiftInfo: true,
    });

    expect(plan).not.toBeNull();
    expect(plan?.liveDataFreshness).toBe("stale");
    expect(plan?.liveDataCheckedAt).toBeTruthy();
    expect(plan?.liveUpdates?.[0]).toContain("scheduled timetable");
    expect(plan?.liveUpdates?.[1]).toContain("Lift status");
  });

  it("uses heuristic fallback walking estimate when Mapbox token is missing", async () => {
    delete process.env.MAPBOX_ACCESS_TOKEN;

    const result = await estimateWalkFromStation("Parramatta Station", "Sydney Opera House");

    expect(result.distanceMetres).toBe(350);
    expect(result.minutes).toBeGreaterThan(0);
  });

  it("uses Mapbox geocoding + directions for walking estimate when configured", async () => {
    process.env.MAPBOX_ACCESS_TOKEN = "mapbox-token";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [{ center: [151.0, -33.8] }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [{ center: [151.2, -33.85] }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ routes: [{ distance: 920, duration: 720 }] }),
      });

    global.fetch = fetchMock as typeof fetch;

    const result = await estimateWalkFromStation("Parramatta Station", "Sydney Opera House");

    expect(result.distanceMetres).toBe(920);
    expect(result.minutes).toBe(12);
    expect(result.steps).toBeGreaterThan(1000);
  });
});
