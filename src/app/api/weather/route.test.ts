import { logError } from "@/lib/logger";
import { getWeatherForecast } from "@/lib/weather";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/weather", () => ({
  getWeatherForecast: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

import { POST } from "./route";

describe("weather route", () => {
  it("returns forecast for valid input", async () => {
    vi.mocked(getWeatherForecast).mockResolvedValue([
      {
        date: "2026-06-15",
        tempMin: 10,
        tempMax: 20,
        condition: "Clear sky",
        conditionCode: 0,
        chanceOfRain: 5,
        humidity: 60,
        windSpeed: 12,
        uvIndex: 3,
        sunrise: "06:45",
        sunset: "17:00",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: -33.8688, lng: 151.2093, days: 3 }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(getWeatherForecast)).toHaveBeenCalledWith(-33.8688, 151.2093, 3);

    const payload = (await response.json()) as { forecast: unknown[] };
    expect(payload.forecast).toHaveLength(1);
  });

  it("returns 400 for invalid request body", async () => {
    const response = await POST(
      new Request("http://localhost/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: "bad", lng: 151.2093 }),
      }) as never
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toContain("number");
  });

  it("returns 500 when weather service throws", async () => {
    vi.mocked(getWeatherForecast).mockRejectedValue(new Error("boom"));

    const response = await POST(
      new Request("http://localhost/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: -33.8688, lng: 151.2093 }),
      }) as never
    );

    expect(response.status).toBe(500);
    expect(vi.mocked(logError)).toHaveBeenCalledWith("/api/weather", expect.any(Error));
  });
});
