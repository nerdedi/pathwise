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
 * Crawl multiple pages from a venue website (e.g. /accessibility, /visit, /cafe)
 */
export async function crawlVenueSite(
  url: string,
  maxPages = 5
): Promise<FirecrawlResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }

  const res = await fetch("https://api.firecrawl.dev/v1/crawl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      limit: maxPages,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      // Prioritise accessibility and visit planning pages
      includePaths: [
        "*accessibility*",
        "*visit*",
        "*plan*",
        "*cafe*",
        "*food*",
        "*transport*",
        "*parking*",
        "*contact*",
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl crawl error ${res.status}: ${text}`);
  }

  const data = await res.json();
  // Return each page's result
  return (data.data ?? []).map((page: { markdown?: string; metadata?: Record<string, unknown> }) => ({
    markdown: page.markdown ?? "",
    metadata: page.metadata ?? {},
  }));
}
