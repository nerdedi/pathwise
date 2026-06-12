/**
 * Firecrawl — scrapes a venue URL and returns structured markdown + metadata.
 * Docs: https://docs.firecrawl.dev
 */
import { fetchWithTimeout, parseTimeoutFromEnv } from "@/lib/timeout";

export interface FirecrawlResult {
  markdown: string;
  metadata: {
    title?: string;
    description?: string;
    ogImage?: string;
    sourceURL?: string;
  };
}

const LINK_KEYWORDS = [
  "visit",
  "plan",
  "access",
  "accessibility",
  "map",
  "floor",
  "guide",
  "menu",
  "food",
  "dining",
  "cafe",
  "transport",
  "parking",
  "drop-off",
  "dropoff",
  "getting-here",
  "contact",
  "faq",
  "alerts",
  "updates",
  "news",
  "events",
];

const FIRECRAWL_REQUEST_TIMEOUT_MS = parseTimeoutFromEnv(
  "FIRECRAWL_REQUEST_TIMEOUT_MS",
  20_000
);

function normalizeUrl(baseUrl: string, maybeRelative: string) {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractCandidateLinks(markdown: string, baseUrl: string) {
  const origin = new URL(baseUrl).origin;
  const links = new Set<string>();
  const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(markdownLinkPattern)) {
    const raw = match[1]?.trim();
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;
    const absolute = normalizeUrl(baseUrl, raw);
    if (!absolute || !absolute.startsWith(origin)) continue;
    links.add(absolute);
  }

  const filtered = Array.from(links).filter((link) => {
    const lower = link.toLowerCase();
    return LINK_KEYWORDS.some((keyword) => lower.includes(keyword));
  });

  return filtered.sort((a, b) => {
    const score = (value: string) =>
      LINK_KEYWORDS.reduce((total, keyword) => total + (value.includes(keyword) ? 1 : 0), 0);
    return score(b.toLowerCase()) - score(a.toLowerCase());
  });
}

export async function scrapeVenueUrl(url: string): Promise<FirecrawlResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }

  const res = await fetchWithTimeout("https://api.firecrawl.dev/v1/scrape", {
    operation: "Firecrawl scrape",
    timeoutMs: FIRECRAWL_REQUEST_TIMEOUT_MS,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl error ${res.status}: ${text}`);
  }

  const data = await res.json();

  return {
    markdown: data.data?.markdown ?? "",
    metadata: data.data?.metadata ?? {},
  };
}

/**
 * Crawl multiple pages from a venue website by scraping key sub-pages.
 * Uses the synchronous /v1/scrape endpoint for each page (no polling needed).
 */
export async function crawlVenueSite(
  url: string,
  maxPages = 5
): Promise<FirecrawlResult[]> {
  const baseUrl = new URL(url).origin;

  // Sub-paths to try in addition to the homepage
  const subPaths = [
    "/visit",
    "/plan-your-visit",
    "/accessibility",
    "/accessibility-information",
    "/contact",
    "/cafe",
    "/food-and-drink",
    "/menu",
    "/menus",
    "/map",
    "/maps",
    "/floor-plan",
    "/access-guide",
    "/alerts",
    "/service-updates",
    "/parking",
    "/transport",
  ];

  const homepage = await scrapeVenueUrl(url);
  const discoveredLinks = extractCandidateLinks(homepage.markdown, url);
  const seededUrls = [url, ...subPaths.map((p) => baseUrl + p), ...discoveredLinks];
  const urls = Array.from(new Set(seededUrls)).slice(0, Math.max(maxPages, 8));

  const results = await Promise.allSettled(
    urls.map((u) => scrapeVenueUrl(u))
  );

  const pages: FirecrawlResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.markdown.length > 100) {
      pages.push(r.value);
    }
  }

  // Always return at least the homepage scrape
  if (pages.length === 0) {
    return [await scrapeVenueUrl(url)];
  }

  return pages;
}
