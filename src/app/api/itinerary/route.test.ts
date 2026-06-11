import { generateJson } from "@/lib/gemini";
import { logError } from "@/lib/logger";
import { buildItineraryPrompt } from "@/lib/prompts";
import { buildFallbackSocialStoryPanels } from "@/lib/social-story";
import { getTripPlan } from "@/lib/transport-nsw";
import { getWeatherForecast, getWeatherPackingTips } from "@/lib/weather";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/gemini", () => ({
  generateJson: vi.fn(),
}));

vi.mock("@/lib/prompts", () => ({
  buildItineraryPrompt: vi.fn(),
}));

vi.mock("@/lib/social-story", () => ({
  buildFallbackSocialStoryPanels: vi.fn(),
}));

vi.mock("@/lib/transport-nsw", () => ({
  getTripPlan: vi.fn(),
}));

vi.mock("@/lib/weather", () => ({
  getWeatherForecast: vi.fn(),
  getWeatherPackingTips: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

import { POST } from "./route";

const baseVenue = {
  name: "Sydney Opera House",
  address: "Bennelong Point",
  suburb: "Sydney",
  location: { lat: -33.8568, lng: 151.2153 },
  quietTimes: ["Weekday mornings"],
};

const baseProfile = {
  soundSensitivity: "medium",
  crowdSensitivity: "medium",
  routePreference: "balanced",
  needsMobilityAccess: false,
  usesMobilityAid: false,
  needsLevelBoardingInfo: false,
  needsLiveLiftInfo: false,
  hasMedicalNeeds: false,
  soundSensitivityLevel: "medium",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(buildItineraryPrompt).mockReturnValue("system prompt");
  vi.mocked(getWeatherForecast).mockResolvedValue([
    {
      date: "2026-06-15",
      tempMin: 10,
      tempMax: 21,
      condition: "Clear sky",
      conditionCode: 0,
      chanceOfRain: 5,
      humidity: 60,
      windSpeed: 15,
      uvIndex: 4,
      sunrise: "06:45",
      sunset: "17:00",
    },
  ]);
  vi.mocked(getWeatherPackingTips).mockReturnValue(["Bring sunscreen"]);
  vi.mocked(getTripPlan).mockResolvedValue(null);
  vi.mocked(buildFallbackSocialStoryPanels).mockReturnValue([
    {
      sequence: 1,
      title: "Arrive",
      text: "You can arrive at your pace.",
      speakText: "You can arrive at your pace.",
      keywords: ["arrival"],
    },
  ] as never);
});

describe("itinerary route", () => {
  it("returns itinerary and uses fallback social story when AI returns none", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      sections: [
        {
          id: "before-you-go",
          title: "Before you go",
          emoji: "📝",
          content: "Prepare calmly",
          details: ["Pack early"],
          isExpandable: true,
        },
      ],
      packingList: [
        {
          item: "Headphones",
          reason: "Reduce noise",
          priority: "essential",
          category: "sensory",
        },
      ],
      crisisPlan: {
        steps: ["Pause"],
        quietRooms: [],
        exits: [],
        helpDeskLocation: "Reception",
        venuePhone: "",
        selfCareReminders: ["Take a breath"],
      },
      affirmations: [{ text: "You got this", timing: "during" }],
      socialStory: [],
      riskScore: 4,
      riskSummary: "Low to moderate sensory load",
      riskDetails: {},
    });

    const response = await POST(
      new Request("http://localhost/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueData: baseVenue,
          sensoryProfile: baseProfile,
          visitDate: "2026-06-15",
          visitTime: "10:00",
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      itinerary: { socialStory: Array<{ title: string }>; weather: { date: string } | null };
    };

    expect(payload.itinerary.weather?.date).toBe("2026-06-15");
    expect(payload.itinerary.socialStory[0]?.title).toBe("Arrive");
    expect(vi.mocked(buildItineraryPrompt)).toHaveBeenCalled();
  });

  it("returns 400 for invalid request body", async () => {
    const response = await POST(
      new Request("http://localhost/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensoryProfile: baseProfile }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when AI generation throws", async () => {
    vi.mocked(generateJson).mockRejectedValue(new Error("ai unavailable"));

    const response = await POST(
      new Request("http://localhost/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueData: baseVenue,
          sensoryProfile: baseProfile,
        }),
      }) as never
    );

    expect(response.status).toBe(500);
    expect(vi.mocked(logError)).toHaveBeenCalledWith("/api/itinerary", expect.any(Error));
  });
});
