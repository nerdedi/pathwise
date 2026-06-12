import { fetchWithTimeout, parseTimeoutFromEnv } from "@/lib/timeout";

type GooglePlacesTextSearchResponse = {
  places?: Array<{
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    reviews?: Array<{ text?: { text?: string }; rating?: number }>;
    currentOpeningHours?: { openNow?: boolean };
    priceLevel?: string;
  }>;
};

const GOOGLE_PLACES_REQUEST_TIMEOUT_MS = parseTimeoutFromEnv(
  "GOOGLE_PLACES_REQUEST_TIMEOUT_MS",
  8_000
);

export interface GooglePlaceInsights {
  source: "google-places";
  averageRating?: number;
  totalRatings?: number;
  openNow?: boolean;
  reviewHighlights: string[];
}

function cleanReviewText(value: string | undefined) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchGooglePlaceInsights(query: string): Promise<GooglePlaceInsights | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !query.trim()) return null;

  const res = await fetchWithTimeout("https://places.googleapis.com/v1/places:searchText", {
    operation: "Google Places search",
    timeoutMs: GOOGLE_PLACES_REQUEST_TIMEOUT_MS,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.displayName",
        "places.formattedAddress",
        "places.rating",
        "places.userRatingCount",
        "places.reviews",
        "places.currentOpeningHours.openNow",
        "places.priceLevel",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1,
      languageCode: "en",
      regionCode: "AU",
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as GooglePlacesTextSearchResponse;
  const top = data.places?.[0];
  if (!top) return null;

  const reviewHighlights = (top.reviews ?? [])
    .map((review) => cleanReviewText(review.text?.text))
    .filter(Boolean)
    .slice(0, 5)
    .map((text) => (text.length > 220 ? `${text.slice(0, 217)}...` : text));

  return {
    source: "google-places",
    averageRating: top.rating,
    totalRatings: top.userRatingCount,
    openNow: top.currentOpeningHours?.openNow,
    reviewHighlights,
  };
}
