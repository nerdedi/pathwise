import { generateJson } from "@/lib/gemini";
import { buildItineraryPrompt } from "@/lib/prompts";
import { getTripPlan } from "@/lib/transport-nsw";
import { getWeatherForecast, getWeatherPackingTips } from "@/lib/weather";
import type { SensoryProfile } from "@/types/sensory-profile";
import type { VenueData } from "@/types/venue";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  venueData: z.record(z.unknown()),
  sensoryProfile: z.record(z.unknown()),
  visitDate: z.string().optional(), // YYYY-MM-DD
  fromSuburb: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { venueData, sensoryProfile, visitDate, fromSuburb } =
      RequestSchema.parse(body);

    const venue = venueData as unknown as VenueData;
    const profile = sensoryProfile as unknown as SensoryProfile;

    // Run weather + transport in parallel
    const [weatherDays, tripPlanTo, tripPlanFrom] = await Promise.allSettled([
      venue.location
        ? getWeatherForecast(venue.location.lat, venue.location.lng, 7)
        : Promise.resolve(null),
      fromSuburb && visitDate
        ? getTripPlan({
            originName: fromSuburb,
            destinationAddress: `${venue.address}, ${venue.suburb}`,
            date: visitDate.replace(/-/g, ""),
            time: "1000",
          })
        : Promise.resolve(null),
      fromSuburb && visitDate
        ? getTripPlan({
            originName: `${venue.address}, ${venue.suburb}`,
            destinationAddress: fromSuburb,
            date: visitDate.replace(/-/g, ""),
            time: "1500",
            arriveBy: false,
          })
        : Promise.resolve(null),
    ]);

    // Get the weather for the visit date if available
    const weatherList =
      weatherDays.status === "fulfilled" && weatherDays.value
        ? weatherDays.value
        : [];

    const visitWeather = visitDate
      ? weatherList.find((w) => w.date === visitDate) ?? weatherList[0]
      : weatherList[0];

    const packingTips = visitWeather ? getWeatherPackingTips(visitWeather) : [];

    // Build AI itinerary
    const systemPrompt = buildItineraryPrompt(profile);

    const userContent = `
Generate a complete personalised Pathwise itinerary for the following venue and visitor.

VENUE DATA:
${JSON.stringify(venue, null, 2)}

VISIT DATE: ${visitDate ?? "not specified"}
FROM SUBURB: ${fromSuburb ?? "not specified"}

WEATHER FOR VISIT DAY:
${visitWeather ? JSON.stringify(visitWeather, null, 2) : "Not available"}

WEATHER PACKING TIPS: ${packingTips.join(", ") || "none"}

TRANSPORT TO VENUE:
${tripPlanTo.status === "fulfilled" && tripPlanTo.value ? JSON.stringify(tripPlanTo.value, null, 2) : "Not available — provide general advice"}

Return a flat JSON object (no wrapper key) with EXACTLY these top-level keys:
- sections: array of objects, each with: id (string), title (string), emoji (string), content (string), details (string[]), isExpandable (boolean)
  Include these section ids: before-you-go, getting-there, when-you-arrive, the-space, what-to-do, eating-drinking, if-overwhelmed, getting-home
- packingList: array of objects, each with: item (string), reason (string), priority ("essential"|"recommended"|"optional"), category (string)
- crisisPlan: object with: steps (string[]), quietRooms (string[]), exits (string[]), helpDeskLocation (string), venuePhone (string), selfCareReminders (string[])
- affirmations: array of objects, each with: text (string), timing ("before"|"during"|"overwhelmed"|"after")
- socialStory: array of objects, each with: sequence (number), title (string), text (string), imagePrompt (string), emotion (string)
- riskScore: number from 1 to 10
- riskSummary: string
- riskDetails: object where each key is a category name and value is { score: number, detail: string }

Do NOT wrap the output in any outer key like "itinerary". Return the flat object directly.
`.trim();

    const rawData = await generateJson(systemPrompt, userContent) as Record<string, unknown>;
    // Unwrap if model returned { itinerary: {...} } instead of flat object
    const itineraryData = (rawData.sections ? rawData : (rawData.itinerary ?? rawData)) as Record<string, unknown>;

    // Assemble final itinerary
    const itinerary = {
      id: crypto.randomUUID(),
      venueData: venue,
      sensoryProfile: profile,
      visitDate,
      fromSuburb,
      weather: visitWeather ?? null,
      transportTo:
        tripPlanTo.status === "fulfilled" ? tripPlanTo.value : null,
      transportFrom:
        tripPlanFrom.status === "fulfilled" ? tripPlanFrom.value : null,
      generatedAt: new Date().toISOString(),
      ...(itineraryData as object),
    };

    return NextResponse.json({ itinerary });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[/api/itinerary]", err);
    return NextResponse.json(
      { error: "Failed to generate itinerary. Please try again." },
      { status: 500 }
    );
  }
}
