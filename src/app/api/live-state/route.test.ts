import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("live state route", () => {
  it("returns live state when record exists", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        venue_url: "https://example.com/venue",
        venue_name: "Example Venue",
        busyness_level: "busy",
        open_status: "open",
        next_change_at: "2026-06-12T07:00:00.000Z",
        weather_condition: "Rain showers",
        temperature_c: 19,
        weather_recommendation: "Rainy right now — indoor areas are likely more comfortable.",
        source: "provider",
        confidence: 82,
        special_closure_note: null,
        updated_at: "2026-06-12T06:10:00.000Z",
      },
      error: null,
    });

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle,
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => query),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/live-state?venueUrl=https%3A%2F%2Fexample.com%2Fvenue") as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { liveState: { busynessLevel: string; openStatus: string } };
    expect(payload.liveState.busynessLevel).toBe("busy");
    expect(payload.liveState.openStatus).toBe("open");
  });

  it("returns unavailable when live-state table does not exist", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42P01", message: "relation venue_live_state does not exist" },
    });

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle,
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => query),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/live-state?venueUrl=https%3A%2F%2Fexample.com%2Fvenue") as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { liveState: null; unavailable: boolean };
    expect(payload.liveState).toBeNull();
    expect(payload.unavailable).toBe(true);
  });

  it("returns 400 for invalid venue URL", async () => {
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn() } as never);

    const response = await GET(
      new Request("http://localhost/api/live-state?venueUrl=not-a-url") as never
    );

    expect(response.status).toBe(400);
  });
});
