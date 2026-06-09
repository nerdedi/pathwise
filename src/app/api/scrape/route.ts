import { crawlVenueSite, scrapeVenueUrl } from "@/lib/firecrawl";
import { generateJson } from "@/lib/gemini";
import { logError } from "@/lib/logger";
import { VENUE_EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

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
    const venueData = await generateJson(VENUE_EXTRACTION_SYSTEM_PROMPT, userMessage);

    return NextResponse.json({ venueData });
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
