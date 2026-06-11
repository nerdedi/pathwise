import { crawlVenueSite, scrapeVenueUrl } from "@/lib/firecrawl";
import { generateJson } from "@/lib/gemini";
import { fetchGooglePlaceInsights } from "@/lib/google-places";
import { logError } from "@/lib/logger";
import { VENUE_EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

function collectEstimatedFieldPaths(value: unknown, basePath = ""): string[] {
  if (typeof value === "string") {
    return value.toLowerCase().includes("(estimated)") && basePath ? [basePath] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectEstimatedFieldPaths(item, `${basePath}[${index}]`)
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      collectEstimatedFieldPaths(child, basePath ? `${basePath}.${key}` : key)
    );
  }

  return [];
}

function extractSiteUpdates(markdown: string) {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const updateKeywords = [
    "alert",
    "update",
    "changed",
    "closed",
    "maintenance",
    "cancelled",
    "service",
    "disruption",
    "today",
  ];

  const updates = lines
    .filter((line) => updateKeywords.some((keyword) => line.toLowerCase().includes(keyword)))
    .filter((line) => line.length >= 12 && line.length <= 220)
    .slice(0, 6);

  return Array.from(new Set(updates));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = RequestSchema.parse(body);

    // 1. Crawl the venue site (up to 5 pages: main, visit, accessibility, café, contact)
    let pages;
    try {
      pages = await crawlVenueSite(url, 5);
    } catch {
      // Fall back to single-page scrape if crawl fails
      const single = await scrapeVenueUrl(url);
      pages = [single];
    }

    // 2. Combine all page content
    const combinedContent = pages
      .map((p) => `## Page: ${p.metadata.sourceURL ?? url}\n\n${p.markdown}`)
      .join("\n\n---\n\n")
      .slice(0, 60000); // stay within token limits

    // 3. Extract structured venue data with Gemini
    const userMessage = `Extract structured venue data from the following website content.\n\nWebsite URL: ${url}\n\nContent:\n${combinedContent}`;
    const venueData = (await generateJson(VENUE_EXTRACTION_SYSTEM_PROMPT, userMessage)) as Record<string, unknown>;

    const googleInsights = await fetchGooglePlaceInsights(
      `${String(venueData.name ?? "")} ${String(venueData.address ?? "")} ${String(venueData.suburb ?? "")}`.trim()
    );

    const liveUpdates = extractSiteUpdates(combinedContent);
    const estimatedFieldPaths = Array.from(
      new Set(collectEstimatedFieldPaths(venueData).slice(0, 40))
    );

    const enrichedVenueData = {
      ...venueData,
      liveUpdates,
      externalInsights: {
        ...(typeof venueData.externalInsights === "object" && venueData.externalInsights !== null
          ? (venueData.externalInsights as Record<string, unknown>)
          : {}),
        source: "google-places",
        ...(googleInsights ?? {}),
      },
      sourceMeta: {
        sitePagesScanned: pages.length,
        hasGoogleInsights: Boolean(googleInsights),
        estimatedFieldPaths,
        updatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json({ venueData: enrichedVenueData });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    logError("/api/scrape", err);
    return NextResponse.json(
      { error: "Failed to scrape venue. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
