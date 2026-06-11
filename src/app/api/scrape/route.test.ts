import { crawlVenueSite, scrapeVenueUrl } from "@/lib/firecrawl";
import { generateJson } from "@/lib/gemini";
import { fetchGooglePlaceInsights } from "@/lib/google-places";
import { logError } from "@/lib/logger";
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

import { POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("scrape route", () => {
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
        sourceMeta: { sitePagesScanned: number; hasGoogleInsights: boolean };
      };
    };

    expect(payload.venueData.sourceMeta.sitePagesScanned).toBe(1);
    expect(payload.venueData.sourceMeta.hasGoogleInsights).toBe(false);
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
        sourceMeta: {
          fallbackReason: string;
          hasGoogleInsights: boolean;
        };
      };
    };

    expect(payload.venueData.name).toBe("example.com");
    expect(payload.venueData.liveUpdates[0]).toContain("local mode");
    expect(payload.venueData.sourceMeta.fallbackReason).toContain("Missing local API keys");
    expect(payload.venueData.sourceMeta.hasGoogleInsights).toBe(false);
    expect(vi.mocked(logError)).not.toHaveBeenCalled();
  });
});
