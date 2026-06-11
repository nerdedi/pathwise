import { logError } from "@/lib/logger";
import { getTripPlan } from "@/lib/transport-nsw";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/transport-nsw", () => ({
  getTripPlan: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

import { POST } from "./route";

describe("transport route", () => {
  it("returns a trip plan for valid input", async () => {
    vi.mocked(getTripPlan).mockResolvedValue({
      legs: [],
      totalDurationMinutes: 35,
      departureTime: "2026-06-15T10:00:00+10:00",
      arrivalTime: "2026-06-15T10:35:00+10:00",
      isAccessible: true,
      totalApproximateSteps: 450,
      notes: "ok",
    });

    const response = await POST(
      new Request("http://localhost/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Parramatta",
          to: "Sydney Opera House",
          date: "2026-06-15",
          time: "10:30",
          routePreference: "quietest",
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(getTripPlan)).toHaveBeenCalledWith(
      expect.objectContaining({
        originName: "Parramatta",
        destinationAddress: "Sydney Opera House",
        date: "20260615",
        time: "1030",
        routePreference: "quietest",
      })
    );
  });

  it("returns 503 when transport provider is unavailable", async () => {
    vi.mocked(getTripPlan).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "Parramatta", to: "Opera House" }),
      }) as never
    );

    expect(response.status).toBe(503);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toContain("TRANSPORT_NSW_API_KEY");
  });

  it("returns 400 for invalid request body", async () => {
    const response = await POST(
      new Request("http://localhost/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "", to: "Opera House" }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when transport service throws", async () => {
    vi.mocked(getTripPlan).mockRejectedValue(new Error("service down"));

    const response = await POST(
      new Request("http://localhost/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "Parramatta", to: "Opera House" }),
      }) as never
    );

    expect(response.status).toBe(500);
    expect(vi.mocked(logError)).toHaveBeenCalledWith("/api/transport", expect.any(Error));
  });
});
