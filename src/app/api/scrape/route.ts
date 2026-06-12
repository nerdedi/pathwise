import { crawlVenueSite, scrapeVenueUrl } from "@/lib/firecrawl";
import { generateJson } from "@/lib/gemini";
import { fetchGooglePlaceInsights } from "@/lib/google-places";
import { detectLiveVenueEvent } from "@/lib/live-events";
import { deriveLiveVenueState } from "@/lib/live-state";
import { logError } from "@/lib/logger";
import { VENUE_EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTimeoutFromEnv, withTimeout } from "@/lib/timeout";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 120;

const SCRAPE_ROUTE_CRAWL_TIMEOUT_MS = parseTimeoutFromEnv(
  "SCRAPE_ROUTE_CRAWL_TIMEOUT_MS",
  25_000
);
const SCRAPE_ROUTE_SINGLE_PAGE_TIMEOUT_MS = parseTimeoutFromEnv(
  "SCRAPE_ROUTE_SINGLE_PAGE_TIMEOUT_MS",
  15_000
);
const SCRAPE_ROUTE_PERSIST_TIMEOUT_MS = parseTimeoutFromEnv(
  "SCRAPE_ROUTE_PERSIST_TIMEOUT_MS",
  2_500
);

const RequestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

function buildFallbackVenueData(url: string, reason: string) {
  let host = "Venue";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // no-op
  }

  return {
    name: host,
    url,
    address: "Address unavailable (estimated)",
    suburb: "Sydney (estimated)",
    quietTimes: "Weekday mornings (estimated)",
    liveUpdates: ["Live venue updates unavailable in local mode."],
    externalInsights: {
      source: "google-places",
      reviewHighlights: [],
    },
    sourceMeta: {
      sitePagesScanned: 0,
      hasGoogleInsights: false,
      estimatedFieldPaths: ["address", "suburb", "quietTimes"],
      updatedAt: new Date().toISOString(),
      fallbackReason: reason,
      googleQueriesTried: [],
      liveUpdatesSyncedAt: new Date().toISOString(),
    },
    liveState: {
      busynessLevel: "moderate",
      openStatus: "closed",
      updatedAt: new Date().toISOString(),
      source: "derived",
      confidence: 35,
      weatherRecommendation: "Live weather-aware suggestions are unavailable in local mode.",
    },
  };
}

function isRecoverableScrapeError(error: unknown) {
  const message = String((error as { message?: string } | undefined)?.message ?? "").toLowerCase();
  return (
    message.includes("firecrawl_api_key") ||
    message.includes("no ai api key found") ||
    message.includes("google_ai_api_key") ||
    message.includes("groq_api_key") ||
    message.includes("request too large") ||
    message.includes("tokens per minute") ||
    message.includes("rate limit") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
}

function isMissingLiveStateInfra(error: unknown) {
  const code = (error as { code?: string } | undefined)?.code;
  const message = String((error as { message?: string } | undefined)?.message ?? "").toLowerCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("venue_live_state") ||
    message.includes("venue_live_events") ||
    message.includes("user_saved_venues") ||
    message.includes("user_notifications")
  );
}

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

async function persistLiveVenueState(snapshot: {
  venueUrl: string;
  venueName?: string;
  busynessLevel: string;
  openStatus: string;
  nextChangeAt?: string;
  weatherCondition?: string;
  temperatureC?: number;
  weatherRecommendation?: string;
  source: string;
  confidence: number;
  specialClosureNote?: string;
  updatedAt: string;
}) {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: previousRow, error: previousError } = await admin
    .from("venue_live_state")
    .select(
      "busyness_level, open_status, next_change_at, weather_recommendation, special_closure_note"
    )
    .eq("venue_url", snapshot.venueUrl)
    .maybeSingle();

  if (previousError && !isMissingLiveStateInfra(previousError)) {
    logError("/api/scrape live-state select", previousError);
  }

  const { error } = await admin
    .from("venue_live_state")
    .upsert(
      {
        venue_url: snapshot.venueUrl,
        venue_name: snapshot.venueName,
        busyness_level: snapshot.busynessLevel,
        open_status: snapshot.openStatus,
        next_change_at: snapshot.nextChangeAt,
        weather_condition: snapshot.weatherCondition,
        temperature_c: snapshot.temperatureC,
        weather_recommendation: snapshot.weatherRecommendation,
        source: snapshot.source,
        confidence: snapshot.confidence,
        special_closure_note: snapshot.specialClosureNote,
        updated_at: snapshot.updatedAt,
      },
      { onConflict: "venue_url" }
    );

  if (error && !isMissingLiveStateInfra(error)) {
    logError("/api/scrape live-state upsert", error);
    return;
  }

  if (error && isMissingLiveStateInfra(error)) {
    return;
  }

  const event = detectLiveVenueEvent(
    previousRow
      ? {
          busynessLevel: previousRow.busyness_level,
          openStatus: previousRow.open_status,
          nextChangeAt: previousRow.next_change_at,
          weatherRecommendation: previousRow.weather_recommendation,
          specialClosureNote: previousRow.special_closure_note,
        }
      : null,
    {
      busynessLevel: snapshot.busynessLevel as never,
      openStatus: snapshot.openStatus as never,
      nextChangeAt: snapshot.nextChangeAt,
      weatherRecommendation: snapshot.weatherRecommendation,
      specialClosureNote: snapshot.specialClosureNote,
    }
  );

  if (!event) return;

  const { data: eventRow, error: eventInsertError } = await admin
    .from("venue_live_events")
    .insert({
      venue_url: snapshot.venueUrl,
      venue_name: snapshot.venueName,
      event_type: event.eventType,
      title: event.title,
      body: event.body,
      payload: event.payload,
    })
    .select("id")
    .maybeSingle();

  if (eventInsertError) {
    if (!isMissingLiveStateInfra(eventInsertError)) {
      logError("/api/scrape live-event insert", eventInsertError);
    }
    return;
  }

  const subscribersBuilder = admin
    .from("user_saved_venues")
    .select("user_id, preferred_guide_id")
    .eq("venue_url", snapshot.venueUrl)
    .eq("notifications_enabled", true);

  const { data: subscribers, error: subscribersError } = await subscribersBuilder;

  if (subscribersError) {
    if (!isMissingLiveStateInfra(subscribersError)) {
      logError("/api/scrape live-event subscribers", subscribersError);
    }
    return;
  }

  if (!subscribers || subscribers.length === 0) return;

  const notificationRows = subscribers.map((subscriber) => ({
    user_id: subscriber.user_id,
    notification_type: `live_${event.eventType}`,
    title: event.title,
    body: snapshot.venueName ? `${snapshot.venueName}: ${event.body}` : event.body,
    metadata: {
      venueUrl: snapshot.venueUrl,
      venueName: snapshot.venueName,
      eventType: event.eventType,
      eventId: eventRow?.id,
      preferredGuideId: subscriber.preferred_guide_id,
      ...event.payload,
    },
  }));

  const { error: notificationsError } = await admin
    .from("user_notifications")
    .insert(notificationRows);

  if (notificationsError && !isMissingLiveStateInfra(notificationsError)) {
    logError("/api/scrape live-event notifications", notificationsError);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = RequestSchema.parse(body);

    // 1. Crawl the venue site (up to 5 pages: main, visit, accessibility, café, contact)
    let pages;
    try {
      pages = await withTimeout(
        "Venue crawl",
        SCRAPE_ROUTE_CRAWL_TIMEOUT_MS,
        crawlVenueSite(url, 5)
      );
    } catch {
      // Fall back to single-page scrape if crawl fails
      const single = await withTimeout(
        "Single-page venue scrape",
        SCRAPE_ROUTE_SINGLE_PAGE_TIMEOUT_MS,
        scrapeVenueUrl(url)
      );
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

    const queryCandidates = [
      `${String(venueData.name ?? "")} ${String(venueData.address ?? "")} ${String(venueData.suburb ?? "")}`.trim(),
      `${String(venueData.name ?? "")} ${String(venueData.suburb ?? "")}`.trim(),
      `${String(venueData.name ?? "")}`.trim(),
      `${new URL(url).hostname.replace(/^www\./, "")} ${String(venueData.suburb ?? "")}`.trim(),
    ].filter(Boolean);

    let googleInsights = null;
    for (const candidate of Array.from(new Set(queryCandidates))) {
      googleInsights = await withTimeout(
        `Google Places enrichment for ${candidate}`,
        4_500,
        fetchGooglePlaceInsights(candidate)
      ).catch(() => null);
      if (googleInsights) break;
    }

    const liveUpdates = extractSiteUpdates(combinedContent);
    const weatherCondition = liveUpdates.find((line) =>
      /rain|storm|heat|cold|snow|wind/i.test(line)
    );
    const liveState = deriveLiveVenueState({
      venueData: {
        ...(venueData as Record<string, unknown>),
        liveUpdates,
      } as never,
      providerOpenNow: googleInsights?.openNow,
      weather: weatherCondition ? { condition: weatherCondition } : undefined,
      source: googleInsights?.openNow === undefined ? "derived" : "provider",
    });
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
        googleQueriesTried: Array.from(new Set(queryCandidates)).slice(0, 5),
        liveUpdatesSyncedAt: new Date().toISOString(),
      },
      liveState,
    };

    await withTimeout(
      "Persist live venue state",
      SCRAPE_ROUTE_PERSIST_TIMEOUT_MS,
      persistLiveVenueState({
        venueUrl: url,
        venueName: String(venueData.name ?? ""),
        busynessLevel: liveState.busynessLevel,
        openStatus: liveState.openStatus,
        nextChangeAt: liveState.nextChangeAt,
        weatherCondition,
        weatherRecommendation: liveState.weatherRecommendation,
        source: liveState.source,
        confidence: liveState.confidence,
        specialClosureNote: liveState.specialClosureNote,
        updatedAt: liveState.updatedAt,
      })
    ).catch(() => undefined);

    return NextResponse.json({ venueData: enrichedVenueData });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    if (isRecoverableScrapeError(err)) {
      const body = await req.json().catch(() => ({} as { url?: string }));
      const fallbackUrl = typeof body.url === "string" ? body.url : "https://example.com";
      return NextResponse.json({
        venueData: buildFallbackVenueData(fallbackUrl, "Missing local API keys for scrape/AI providers."),
      });
    }

    logError("/api/scrape", err);
    return NextResponse.json(
      { error: "Failed to scrape venue. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
