import { crawlVenueSite, scrapeVenueUrl } from "@/lib/firecrawl";
import { generateJson } from "@/lib/gemini";
import { fetchGooglePlaceInsights } from "@/lib/google-places";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firecrawl", () => ({
  crawlVenueSite: vi.fn(),
  scrapeVenueUrl: vi.fn(),
}));

vi.mock("@/lib/gemini", () => ({
  generateJson: vi.fn(),
}));

vi.mock("@/lib/google-places", () => ({
  fetchGooglePlaceInsights: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => null),
}));

import { POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("scrape route", () => {
  it("creates live events and notifications for subscribed users when live status changes", async () => {
    vi.mocked(crawlVenueSite).mockResolvedValue([
      {
        markdown: "Service update: venue is open with normal operations.",
        metadata: { sourceURL: "https://example.com" },
      },
    ]);

    vi.mocked(generateJson).mockResolvedValue({
      name: "Example Venue",
      address: "1 Test Street",
      suburb: "Sydney",
      openingHours: { thursday: "9:00am - 10:00pm" },
      peakTimes: "Lunch",
      quietTimes: "Weekday mornings",
    });

    vi.mocked(fetchGooglePlaceInsights).mockResolvedValue({
      source: "google-places",
      openNow: true,
      averageRating: 4.2,
      totalRatings: 120,
      reviewHighlights: ["Usually quiet in the morning"],
    });

    const liveStateSelect = {
      select: vi.fn(() => liveStateSelect),
      eq: vi.fn(() => liveStateSelect),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          busyness_level: "quiet",
          open_status: "closed",
          next_change_at: null,
          weather_recommendation: null,
          special_closure_note: null,
        },
        error: null,
      }),
    };

    const liveStateUpsert = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    const eventInsert = {
      insert: vi.fn(() => eventInsert),
      select: vi.fn(() => eventInsert),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "event-1" }, error: null }),
    };

    const subscribersSelect = {
      select: vi.fn(() => subscribersSelect),
      eq: vi.fn(() => subscribersSelect),
      then: undefined,
    } as unknown as {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
    };

    let subscribersEqCalls = 0;
    subscribersSelect.eq = vi.fn(() => {
      subscribersEqCalls += 1;
      if (subscribersEqCalls >= 2) {
        return Promise.resolve({
          data: [{ user_id: "user-1" }, { user_id: "user-2" }],
          error: null,
        });
      }
      return subscribersSelect;
    });

    const notificationsInsert = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    let liveStateFromCalls = 0;
    const adminFrom = vi.fn((table: string) => {
      if (table === "venue_live_state") {
        liveStateFromCalls += 1;
        return liveStateFromCalls === 1 ? liveStateSelect : liveStateUpsert;
      }
      if (table === "venue_live_events") return eventInsert;
      if (table === "user_saved_venues") return subscribersSelect;
      if (table === "user_notifications") return notificationsInsert;
      throw new Error(`unexpected table ${table}`);
    });

    vi.mocked(createAdminClient).mockReturnValue({
      from: adminFrom,
    } as never);

    const response = await POST(
      new Request("http://localhost/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(eventInsert.insert).toHaveBeenCalled();
    expect(notificationsInsert.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ user_id: "user-1" }),
        expect.objectContaining({ user_id: "user-2" }),
      ])
    );
  });

  it("returns enriched venue data with source metadata", async () => {
    vi.mocked(crawlVenueSite).mockResolvedValue([
      {
        markdown: "Service update: Lift maintenance today near entry.",
        metadata: { sourceURL: "https://example.com" },
      },
      {
        markdown: "Accessibility details and quieter zones are available.",
        metadata: { sourceURL: "https://example.com/accessibility" },
      },
    ]);

    vi.mocked(generateJson).mockResolvedValue({
      name: "Example Venue",
      address: "1 Test Street",
      suburb: "Sydney",
      quietTimes: ["After 2pm (estimated)"],
      accessibility: {
        notes: "Entry route timing can vary (estimated)",
      },
    });

    vi.mocked(fetchGooglePlaceInsights).mockResolvedValue({
      source: "google-places",
      averageRating: 4.3,
      totalRatings: 18,
      openNow: true,
      reviewHighlights: ["Calm weekday mornings"],
    });

    const response = await POST(
      new Request("http://localhost/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      }) as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      venueData: {
        liveUpdates: string[];
        liveState: { busynessLevel: string; openStatus: string; updatedAt: string };
        sourceMeta: {
          sitePagesScanned: number;
          hasGoogleInsights: boolean;
          estimatedFieldPaths: string[];
          updatedAt: string;
        };
        externalInsights: { source: string; averageRating: number };
      };
    };

    expect(payload.venueData.liveUpdates.length).toBeGreaterThan(0);
    expect(payload.venueData.sourceMeta.sitePagesScanned).toBe(2);
    expect(payload.venueData.sourceMeta.hasGoogleInsights).toBe(true);
    expect(payload.venueData.sourceMeta.estimatedFieldPaths).toContain("quietTimes[0]");
    expect(payload.venueData.sourceMeta.estimatedFieldPaths).toContain("accessibility.notes");
    expect(payload.venueData.sourceMeta.updatedAt).toBeTypeOf("string");
    expect(payload.venueData.externalInsights.source).toBe("google-places");
    expect(payload.venueData.liveState.busynessLevel).toBeTruthy();
    expect(payload.venueData.liveState.openStatus).toBeTruthy();
    expect(payload.venueData.liveState.updatedAt).toBeTypeOf("string");
  });

  it("falls back to single-page scrape when crawl fails", async () => {
    vi.mocked(crawlVenueSite).mockRejectedValue(new Error("crawl unavailable"));
    vi.mocked(scrapeVenueUrl).mockResolvedValue({
      markdown: "Service alert: entry door changed today.",
      metadata: { sourceURL: "https://example.com" },
    });

    vi.mocked(generateJson).mockResolvedValue({
      name: "Example Venue",
      address: "1 Test Street",
      suburb: "Sydney",
    });

    vi.mocked(fetchGooglePlaceInsights).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      }) as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      venueData: {
        liveState: { source: string };
        sourceMeta: { sitePagesScanned: number; hasGoogleInsights: boolean };
      };
    };

    expect(payload.venueData.sourceMeta.sitePagesScanned).toBe(1);
    expect(payload.venueData.sourceMeta.hasGoogleInsights).toBe(false);
    expect(payload.venueData.liveState.source).toBe("derived");
  });

  it("returns 400 for invalid URL input", async () => {
    const response = await POST(
      new Request("http://localhost/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "notaurl" }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when scraping fails", async () => {
    vi.mocked(crawlVenueSite).mockRejectedValue(new Error("crawl unavailable"));
    vi.mocked(scrapeVenueUrl).mockRejectedValue(new Error("scrape unavailable"));

    const response = await POST(
      new Request("http://localhost/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      }) as never
    );

    expect(response.status).toBe(500);
    expect(vi.mocked(logError)).toHaveBeenCalledWith("/api/scrape", expect.any(Error));
  });

  it("returns fallback venue data when local provider keys are missing", async () => {
    vi.mocked(crawlVenueSite).mockRejectedValue(new Error("Missing FIRECRAWL_API_KEY"));
    vi.mocked(scrapeVenueUrl).mockRejectedValue(new Error("Missing FIRECRAWL_API_KEY"));

    const response = await POST(
      new Request("http://localhost/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      }) as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      venueData: {
        name: string;
        liveUpdates: string[];
        liveState: { source: string; confidence: number };
        sourceMeta: {
          fallbackReason: string;
          hasGoogleInsights: boolean;
        };
      };
    };

    expect(payload.venueData.name).toBe("example.com");
    expect(payload.venueData.liveUpdates[0]).toContain("local mode");
    expect(payload.venueData.liveState.source).toBe("derived");
    expect(payload.venueData.liveState.confidence).toBeLessThanOrEqual(40);
    expect(payload.venueData.sourceMeta.fallbackReason).toContain("Missing local API keys");
    expect(payload.venueData.sourceMeta.hasGoogleInsights).toBe(false);
    expect(vi.mocked(logError)).not.toHaveBeenCalled();
  });
});
