/**
 * Firecrawl — scrapes a venue URL and returns structured markdown + metadata.
 * Docs: https://docs.firecrawl.dev
 */
export interface FirecrawlResult {
  markdown: string;
  metadata: {
    title?: string;
    description?: string;
    ogImage?: string;
    sourceURL?: string;
  };
}

export async function scrapeVenueUrl(url: string): Promise<FirecrawlResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
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
    "/parking",
    "/transport",
  ].slice(0, maxPages - 1);

  // Scrape homepage + sub-paths in parallel (cap at maxPages)
  const urls = [url, ...subPaths.map((p) => baseUrl + p)];

  const results = await Promise.allSettled(
    urls.slice(0, maxPages).map((u) => scrapeVenueUrl(u))
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
