import { generateJson } from "@/lib/gemini";
import { AiItinerarySchema } from "@/lib/itinerary-ai";
import { logError, logWarn } from "@/lib/logger";
import { buildItineraryPrompt } from "@/lib/prompts";
import { buildFallbackSocialStoryPanels } from "@/lib/social-story";
import { getTripPlan } from "@/lib/transport-nsw";
import { getWeatherForecast, getWeatherPackingTips } from "@/lib/weather";
import type { ItinerarySection, TransportPlan } from "@/types/itinerary";
import type { SensoryProfile } from "@/types/sensory-profile";
import type { VenueData } from "@/types/venue";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  venueData: z.record(z.unknown()),
  sensoryProfile: z.record(z.unknown()),
  visitDate: z.string().optional(), // YYYY-MM-DD
  visitTime: z.string().optional(), // HH:MM
  arriveBy: z.boolean().optional(),
  fromSuburb: z.string().optional(),
});

function addHoursToTimeString(time: string, hoursToAdd: number) {
  const [rawHours, rawMinutes] = time.split(":").map((value) => Number(value));
  const hours = Number.isFinite(rawHours) ? rawHours : 10;
  const minutes = Number.isFinite(rawMinutes) ? rawMinutes : 0;
  const totalMinutes = (hours * 60 + minutes + hoursToAdd * 60) % (24 * 60);
  const normalizedHours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const normalizedMinutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${normalizedHours}:${normalizedMinutes}`;
}

function buildFallbackTransportPlan({
  from,
  to,
  date,
  time,
  routePreference,
}: {
  from: string;
  to: string;
  date?: string;
  time: string;
  routePreference?: "balanced" | "fastest" | "quietest";
}): TransportPlan {
  const departure = `${date ?? new Date().toISOString().slice(0, 10)}T${time}:00`;
  const arrival = `${date ?? new Date().toISOString().slice(0, 10)}T${addHoursToTimeString(time, 1)}:00`;

  return {
    fromSuburb: from,
    toVenue: to,
    totalDurationMinutes: 55,
    totalApproximateSteps: 1800,
    accessibleRoute: true,
    notes: "This is a fallback route estimate. Tap refresh or regenerate once live transport is available.",
    routePreference,
    stressScore: 5,
    journeyReminder: "Leave 15 minutes earlier for a calmer transfer.",
    liveDataFreshness: "fallback",
    liveDataCheckedAt: new Date().toISOString(),
    liveUpdates: ["Live trip feeds unavailable right now — using fallback route planning."],
    reminders: [
      "Set a leave-on-time alarm.",
      "Check platform and stop signage before boarding.",
      "Prepare one stop early.",
    ],
    legs: [
      {
        mode: "walk",
        from,
        to: "Nearest transport stop",
        departureTime: departure,
        arrivalTime: departure,
        durationMinutes: 10,
        approximateSteps: 1000,
        stepByStepInstructions: [
          "Follow the most direct path to your nearest bus or train stop.",
          "Use crossings and quieter streets where possible.",
        ],
      },
      {
        mode: "bus",
        from: "Nearest transport stop",
        to,
        departureTime: departure,
        arrivalTime: arrival,
        durationMinutes: 45,
        accessibilityNotes: "Request ramp assistance from driver if needed.",
        crowdingLevel: "medium",
        noiseLevel: "medium",
      },
    ],
  };
}

function buildFallbackRiskDetails(venue: VenueData, profile: SensoryProfile) {
  const soundBase = venue.soundDescription?.toLowerCase().includes("loud") ? 8 : profile.soundSensitivity === "high" ? 7 : 5;
  const crowdBase = venue.peakTimes?.toLowerCase().includes("weekend") ? 8 : profile.crowdSensitivity === "high" ? 7 : 5;
  const lightBase = venue.lightingDescription?.toLowerCase().includes("bright") ? 7 : profile.lightSensitivity === "high" ? 7 : 4;
  const changeBase = profile.changeSensitivity === "high" ? 7 : 4;

  return {
    sound: {
      score: Math.max(1, Math.min(10, soundBase)),
      detail: venue.soundDescription || "Likely moderate venue sounds with short louder periods.",
    },
    crowds: {
      score: Math.max(1, Math.min(10, crowdBase)),
      detail: venue.peakTimes || "Crowding may increase during popular hours.",
    },
    lighting: {
      score: Math.max(1, Math.min(10, lightBase)),
      detail: venue.lightingDescription || "Mixed indoor/outdoor lighting with potential glare.",
    },
    unpredictability: {
      score: Math.max(1, Math.min(10, changeBase)),
      detail:
        venue.liveUpdates && venue.liveUpdates.length > 0
          ? "Live service/venue changes have been observed — check updates before each leg."
          : "Expect occasional changes to queues, access routes, or noise levels.",
    },
  };
}

function ensureDetailedSections(params: {
  sections: ItinerarySection[];
  venue: VenueData;
  weatherTips: string[];
  transportTo: TransportPlan | null;
  transportFrom: TransportPlan | null;
}) {
  const { sections, venue, weatherTips, transportTo, transportFrom } = params;
  const byId = new Map(sections.map((section) => [section.id, section]));

  const templates: Record<string, ItinerarySection> = {
    "before-you-go": {
      id: "before-you-go",
      title: "Before you go",
      emoji: "🧾",
      content: `Plan a gentle start before leaving for ${venue.name}.`,
      details: [
        `Check venue timing: ${venue.openingHours ? "review today's opening hours" : "confirm opening hours online"}.`,
        `Pack sensory supports based on your profile and the venue environment.`,
        weatherTips.length > 0 ? `Weather prep: ${weatherTips.join(" ")}` : "Bring a water bottle and one comfort item.",
        "Save this plan offline in case mobile signal drops.",
      ],
      isExpandable: true,
    },
    "getting-there": {
      id: "getting-there",
      title: "Getting there",
      emoji: "🚌",
      content: transportTo
        ? `Use the planned route and prepare one stop before your destination.`
        : "A fallback route estimate is included. Refresh transport when live data is available.",
      details: [
        transportTo
          ? `Estimated trip: ${transportTo.totalDurationMinutes} minutes, ~${transportTo.totalApproximateSteps} steps.`
          : "Fallback route currently active; allow extra buffer time.",
        "If the service is busy, wait for a calmer option when possible.",
        "Set a stop alert or reminder one stop early.",
        "If disrupted, reroute from your current stop — no need to restart from the beginning.",
      ],
      isExpandable: true,
    },
    "when-you-arrive": {
      id: "when-you-arrive",
      title: "When you arrive",
      emoji: "📍",
      content: `Take 2 minutes to orient yourself at ${venue.name} before starting activities.`,
      details: [
        "Find a calm anchor point (entry wall, map, bench, or quiet corner).",
        venue.dropOffArea ? `Drop-off note: ${venue.dropOffArea}` : "Identify nearest accessible entrance and exits.",
        "Confirm nearest toilet and help desk location early.",
        "If your energy feels low, shorten the first activity block.",
      ],
      isExpandable: true,
    },
    "the-space": {
      id: "the-space",
      title: "The space",
      emoji: "🧭",
      content: `This venue is likely ${venue.overallSensoryRating || "moderate"} overall, with changing sensory load by area.`,
      details: [
        venue.soundDescription || "Sound may vary between quieter and busier zones.",
        venue.lightingDescription || "Lighting may include bright transitions in some areas.",
        venue.smellDescription || "Smells can change near food and high-traffic spaces.",
        venue.quietTimes ? `Calmer window: ${venue.quietTimes}` : "Aim for earlier times where possible.",
      ],
      isExpandable: true,
    },
    "what-to-do": {
      id: "what-to-do",
      title: "What to do",
      emoji: "🎯",
      content: "Use short activity blocks with reset breaks between them.",
      details: [
        "Start with one familiar activity before high-stimulation areas.",
        "Use a 20–30 minute cycle: activity, pause, hydration, reassess.",
        "If a zone feels too intense, switch to your backup activity.",
        "Keep one easy exit option active at all times.",
      ],
      isExpandable: true,
    },
    "eating-drinking": {
      id: "eating-drinking",
      title: "Eating & drinking",
      emoji: "🍽️",
      content: "Plan food timing early to avoid peak crowds and long waits.",
      details: [
        "Choose quieter seating edges where possible.",
        "Check allergens and dietary options before ordering.",
        "Carry a familiar snack for transitions.",
        "Use hydration breaks to reset sensory load.",
      ],
      isExpandable: true,
    },
    "if-overwhelmed": {
      id: "if-overwhelmed",
      title: "If overwhelmed",
      emoji: "🫶",
      content: "Pause early, move to a quieter spot, and reduce demands for 5–10 minutes.",
      details: [
        "Use one grounding action first (breath, pressure, sip of water, visual anchor).",
        "Move to a quieter zone or exit-adjacent area.",
        "Send a short support message if needed.",
        "You can leave and re-enter later if that feels better.",
      ],
      isExpandable: true,
    },
    "getting-home": {
      id: "getting-home",
      title: "Getting home",
      emoji: "🏠",
      content: transportFrom
        ? "Use the return route and preserve extra energy for the final leg."
        : "No return plan detected yet — create one before leaving the venue.",
      details: [
        "Prepare the return route before your energy drops.",
        "If the first service is too crowded, wait for the next calmer service.",
        "Keep one backup route option available.",
        "Use a short decompression break once you arrive home.",
      ],
      isExpandable: true,
    },
  };

  const requiredOrder = [
    "before-you-go",
    "getting-there",
    "when-you-arrive",
    "the-space",
    "what-to-do",
    "eating-drinking",
    "if-overwhelmed",
    "getting-home",
  ];

  const merged = requiredOrder.map((id) => {
    const existing = byId.get(id);
    const template = templates[id];
    if (!existing) return template;

    const details = [...(existing.details ?? [])].filter(Boolean);
    const topUp = template.details?.filter((line) => !details.includes(line)) ?? [];

    return {
      ...template,
      ...existing,
      details: [...details, ...topUp].slice(0, 8),
    };
  });

  return merged;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { venueData, sensoryProfile, visitDate, visitTime, arriveBy, fromSuburb } =
      RequestSchema.parse(body);

    const venue = venueData as unknown as VenueData;
    const profile = sensoryProfile as unknown as SensoryProfile;

    const preferredTime = visitTime && /^\d{2}:\d{2}$/.test(visitTime) ? visitTime : "10:00";
    const outboundTime = preferredTime.replace(":", "");
    const returnTime = addHoursToTimeString(preferredTime, 3).replace(":", "");

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
            time: outboundTime,
            arriveBy,
            routePreference: profile.routePreference,
            wheelchairRequired: profile.needsMobilityAccess || profile.usesMobilityAid,
            needsLevelBoardingInfo: profile.needsLevelBoardingInfo,
            needsLiveLiftInfo: profile.needsLiveLiftInfo,
            needsOnboardToiletInfo: profile.hasMedicalNeeds,
            crowdSensitivity: profile.crowdSensitivity,
            soundSensitivity: profile.soundSensitivity,
          })
        : Promise.resolve(null),
      fromSuburb && visitDate
        ? getTripPlan({
            originName: `${venue.address}, ${venue.suburb}`,
            destinationAddress: fromSuburb,
            date: visitDate.replace(/-/g, ""),
            time: returnTime,
            arriveBy: false,
            routePreference: profile.routePreference,
            wheelchairRequired: profile.needsMobilityAccess || profile.usesMobilityAid,
            needsLevelBoardingInfo: profile.needsLevelBoardingInfo,
            needsLiveLiftInfo: profile.needsLiveLiftInfo,
            needsOnboardToiletInfo: profile.hasMedicalNeeds,
            crowdSensitivity: profile.crowdSensitivity,
            soundSensitivity: profile.soundSensitivity,
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
- socialStory: array of objects, each with: sequence (number), title (string), text (string), imagePrompt (string), emotion (string), sensoryCue (string), supportTip (string), speakText (string), keywords (string[]), translations (optional object with language keys like es/ar/zh where each value has title/text/speakText/sensoryCue/supportTip/keywords)
- riskScore: number from 1 to 10
- riskSummary: string
- riskDetails: object where each key is a category name and value is { score: number, detail: string }

Do NOT wrap the output in any outer key like "itinerary". Return the flat object directly.
`.trim();

    const rawData = await generateJson(systemPrompt, userContent) as Record<string, unknown>;
    // Unwrap if model returned { itinerary: {...} } instead of flat object
    const itineraryData = (rawData.sections ? rawData : (rawData.itinerary ?? rawData)) as Record<string, unknown>;

    const parsedAi = AiItinerarySchema.safeParse(itineraryData);
    if (!parsedAi.success) {
      logWarn("/api/itinerary", "AI output validation fallback", {
        issues: parsedAi.error.flatten(),
      });
    }

    const normalizedAiData = parsedAi.success
      ? parsedAi.data
      : {
          sections: [],
          packingList: [],
          crisisPlan: {
            steps: ["Pause and take a slow breath.", "Move to a quieter area if needed."],
            quietRooms: [],
            exits: [],
            helpDeskLocation: "Ask at venue reception",
            venuePhone: "",
            selfCareReminders: ["It is okay to take breaks.", "You can leave and return later."],
          },
          affirmations: [{ text: "You can take this at your own pace.", timing: "during" as const }],
          socialStory: [],
          riskScore: 5,
          riskSummary: "General preparedness recommended.",
          riskDetails: {},
        };

    const transportTo =
      tripPlanTo.status === "fulfilled" && tripPlanTo.value
        ? tripPlanTo.value
        : fromSuburb
          ? buildFallbackTransportPlan({
              from: fromSuburb,
              to: `${venue.address}, ${venue.suburb}`,
              date: visitDate,
              time: preferredTime,
              routePreference: profile.routePreference,
            })
          : null;

    const transportFrom =
      tripPlanFrom.status === "fulfilled" && tripPlanFrom.value
        ? tripPlanFrom.value
        : fromSuburb
          ? buildFallbackTransportPlan({
              from: `${venue.address}, ${venue.suburb}`,
              to: fromSuburb,
              date: visitDate,
              time: addHoursToTimeString(preferredTime, 3),
              routePreference: profile.routePreference,
            })
          : null;

    const riskDetails =
      normalizedAiData.riskDetails && Object.keys(normalizedAiData.riskDetails).length > 0
        ? normalizedAiData.riskDetails
        : buildFallbackRiskDetails(venue, profile);

    const riskAverage =
      Object.values(riskDetails).reduce((sum, item) => sum + Number(item.score || 0), 0) /
      Math.max(1, Object.keys(riskDetails).length);
    const normalizedRiskScore =
      Number.isFinite(riskAverage) && riskAverage > 0
        ? Math.max(1, Math.min(10, Math.round(riskAverage)))
        : normalizedAiData.riskScore;

    const sections = ensureDetailedSections({
      sections: normalizedAiData.sections,
      venue,
      weatherTips: packingTips,
      transportTo,
      transportFrom,
    });

    const fallbackSocialStory = buildFallbackSocialStoryPanels({
      venueName: venue.name,
      sections,
      quietTimes: venue.quietTimes,
      selfCareReminders: normalizedAiData.crisisPlan.selfCareReminders,
    });

    const socialStory =
      normalizedAiData.socialStory.length > 0
        ? normalizedAiData.socialStory
        : fallbackSocialStory;

    // Assemble final itinerary
    const itinerary = {
      id: crypto.randomUUID(),
      venueData: venue,
      sensoryProfile: profile,
      visitDate,
      fromSuburb,
      weather: visitWeather ?? null,
      transportTo,
      transportFrom,
      generatedAt: new Date().toISOString(),
      sharedWithEmails: [],
      ...normalizedAiData,
      sections,
      riskScore: normalizedRiskScore,
      riskSummary:
        normalizedAiData.riskSummary ||
        "This venue has mixed sensory load. A paced plan with calm breaks is recommended.",
      riskDetails,
      socialStory,
    };

    return NextResponse.json({ itinerary });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    logError("/api/itinerary", err);
    return NextResponse.json(
      { error: "Failed to generate itinerary. Please try again." },
      { status: 500 }
    );
  }
}
