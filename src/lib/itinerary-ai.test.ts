import {
    AiItinerarySchema,
    AiSectionSchema,
    normalizePackingCategory,
    normalizePriority,
} from "@/lib/itinerary-ai";
import { describe, expect, it } from "vitest";

describe("itinerary-ai helpers", () => {
  it("normalizes packing categories across direct, fuzzy, and fallback inputs", () => {
    const cases: Array<[string | undefined, string]> = [
      [undefined, "practical"],
      ["food", "food"],
      ["Sensory needs", "sensory"],
      ["clothing", "comfort"],
      ["medical kit", "medical"],
      ["drink bottle", "food"],
      ["something-unknown", "practical"],
    ];

    for (const [input, expected] of cases) {
      expect(normalizePackingCategory(input)).toBe(expected);
    }
  });

  it("normalizes priority values with recommended fallback", () => {
    expect(normalizePriority("essential")).toBe("essential");
    expect(normalizePriority(" optional ")).toBe("optional");
    expect(normalizePriority("something else")).toBe("recommended");
    expect(normalizePriority(undefined)).toBe("recommended");
  });
});

describe("itinerary-ai schemas", () => {
  it("applies section defaults", () => {
    const section = AiSectionSchema.parse({ id: "s1", title: "Start" });
    expect(section).toEqual({
      id: "s1",
      title: "Start",
      emoji: "📍",
      content: "",
      details: [],
      isExpandable: true,
    });
  });

  it("applies itinerary defaults for minimal payload", () => {
    const itinerary = AiItinerarySchema.parse({});

    expect(itinerary.sections).toEqual([]);
    expect(itinerary.packingList).toEqual([]);
    expect(itinerary.affirmations).toEqual([]);
    expect(itinerary.socialStory).toEqual([]);
    expect(itinerary.crisisPlan.helpDeskLocation).toBe("Ask at venue reception");
    expect(itinerary.riskScore).toBe(5);
    expect(itinerary.riskSummary).toBe("General preparedness recommended.");
    expect(itinerary.riskDetails).toEqual({});
  });

  it("transforms packing list priority/category and catches invalid timing/emotion/score values", () => {
    const itinerary = AiItinerarySchema.parse({
      packingList: [
        {
          item: "Headphones",
          reason: "Lower noise",
          priority: "ESSENTIAL",
          category: "sensory support",
        },
        {
          item: "Bottle",
          reason: "Hydration",
          priority: "n/a",
          category: "drink",
        },
      ],
      affirmations: [{ text: "You can do this", timing: "later" }],
      socialStory: [
        {
          sequence: "-3",
          title: "Arrive",
          text: "You arrive calmly",
          emotion: "very-happy",
          translations: {
            es: { text: "Llegas con calma" },
          },
        },
      ],
      riskScore: "11",
      riskDetails: {
        crowd: { score: 42 },
      },
    });

    expect(itinerary.packingList).toEqual([
      {
        item: "Headphones",
        reason: "Lower noise",
        priority: "essential",
        category: "sensory",
      },
      {
        item: "Bottle",
        reason: "Hydration",
        priority: "recommended",
        category: "food",
      },
    ]);

    expect(itinerary.affirmations[0]?.timing).toBe("during");
    expect(itinerary.socialStory[0]?.sequence).toBe(1);
    expect(itinerary.socialStory[0]?.emotion).toBe("calm");
    expect(itinerary.socialStory[0]?.translations?.es?.keywords).toEqual([]);
    expect(itinerary.riskScore).toBe(5);
    expect(itinerary.riskDetails.crowd).toEqual({ score: 5, detail: "" });
  });
});
