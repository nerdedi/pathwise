import type { SocialStoryPanel } from "@/types/itinerary";
import { describe, expect, it } from "vitest";
import {
    buildFallbackSocialStoryPanels,
    getSocialStoryPanelContent,
    getSocialStoryVisual,
    moveSocialStoryPanel,
    normalizeSocialStoryPanels,
    parseStoredSocialStory,
    updateSocialStoryPanelContent,
} from "./social-story";

const basePanels: SocialStoryPanel[] = [
  {
    sequence: 1,
    title: "I arrive",
    text: "I walk to the entrance.",
    speakText: "I arrive at the entrance.",
    keywords: ["arrive", "entrance"],
    translations: {
      es: {
        title: "Llego",
        text: "Camino a la entrada.",
        speakText: "Llego a la entrada.",
      },
    },
  },
  {
    sequence: 2,
    title: "I check in",
    text: "I can ask for help at the desk.",
  },
];

describe("social story helpers", () => {
  it("returns translated content when available", () => {
    const content = getSocialStoryPanelContent(basePanels[0], "es");

    expect(content.title).toBe("Llego");
    expect(content.text).toBe("Camino a la entrada.");
    expect(content.speakText).toBe("Llego a la entrada.");
  });

  it("falls back to base language content", () => {
    const content = getSocialStoryPanelContent(basePanels[1], "zh");

    expect(content.title).toBe("I check in");
    expect(content.text).toContain("help");
    expect(content.speakText).toContain("I check in");
  });

  it("moves panel order and resequences", () => {
    const moved = moveSocialStoryPanel(basePanels, 1, -1);

    expect(moved[0].title).toBe("I check in");
    expect(moved[0].sequence).toBe(1);
    expect(moved[1].sequence).toBe(2);
  });

  it("updates translated content for selected language", () => {
    const updated = updateSocialStoryPanelContent(basePanels, 0, "es", {
      text: "Camino tranquilo a la entrada.",
    });

    expect(updated[0].translations?.es?.text).toBe("Camino tranquilo a la entrada.");
    expect(updated[0].text).toBe("I walk to the entrance.");
  });

  it("normalizes panel data and trims empty values", () => {
    const normalized = normalizeSocialStoryPanels([
      {
        sequence: 9,
        title: "  Step  ",
        text: "  " as string,
        keywords: [" calm ", "", "calm"],
      },
    ]);

    expect(normalized[0].sequence).toBe(1);
    expect(normalized[0].title).toBe("Step");
    expect(normalized[0].text).toBe("");
    expect(normalized[0].keywords).toEqual(["calm"]);
  });

  it("parses stored story content safely", () => {
    const stored = JSON.stringify(basePanels);
    expect(parseStoredSocialStory(stored)?.length).toBe(2);
    expect(parseStoredSocialStory("not-json")).toBeNull();
    expect(parseStoredSocialStory(JSON.stringify({ not: "an-array" }))).toBeNull();
  });

  it("derives a universal visual cue for a panel", () => {
    const visual = getSocialStoryVisual(basePanels[0], "en");

    expect(visual.icon).toBe("🚪");
    expect(visual.label).toBe("Arrival");
  });

  it("falls back to generic wayfinding visual when no keyword matches", () => {
    const visual = getSocialStoryVisual(
      {
        sequence: 1,
        title: "Moments",
        text: "A reflective moment",
        keywords: ["reflection"],
      },
      "en"
    );

    expect(visual.icon).toBe("🗺️");
    expect(visual.label).toBe("Wayfinding");
  });

  it("keeps sequence normalized when moving out of bounds", () => {
    const moved = moveSocialStoryPanel(basePanels, 0, -1);

    expect(moved[0].sequence).toBe(1);
    expect(moved[1].sequence).toBe(2);
    expect(moved[0].title).toBe(basePanels[0].title);
  });

  it("updates base language panel fields directly", () => {
    const updated = updateSocialStoryPanelContent(basePanels, 1, "en", {
      title: "  New check-in  ",
      text: "  I can ask the desk team for support.  ",
      keywords: [" help ", "", "help", "staff"],
    });

    expect(updated[1].title).toBe("New check-in");
    expect(updated[1].text).toBe("I can ask the desk team for support.");
    expect(updated[1].keywords).toEqual(["help", "staff"]);
  });

  it("builds fallback social story panels from sections and reminders", () => {
    const panels = buildFallbackSocialStoryPanels({
      venueName: "Calm Museum",
      quietTimes: "Weekday mornings",
      selfCareReminders: ["Use your grounding card."],
      sections: [
        {
          id: "before-you-go",
          title: "Before you go",
          emoji: "📝",
          content: "Pack your comfort items.",
          details: ["Bring your headphones."],
        },
        {
          id: "if-overwhelmed",
          title: "If overwhelmed",
          emoji: "🫶",
          content: "Find a quiet space and pause.",
          details: ["Ask staff for a calm corner."],
        },
      ],
    });

    expect(panels.length).toBeGreaterThanOrEqual(4);
    expect(panels[0].title).toContain("Getting ready for Calm Museum");
    expect(panels[0].sensoryCue).toContain("Weekday mornings");
    expect(panels.some((panel) => panel.title === "If I feel overwhelmed")).toBe(true);
    const overwhelmedStep = panels.find((panel) => panel.title === "If overwhelmed");
    expect(overwhelmedStep?.sensoryCue).toContain("okay to pause");
    expect(panels[panels.length - 2]?.supportTip).toBe("Use your grounding card.");
    expect(panels.map((panel) => panel.sequence)).toEqual(
      panels.map((_, index) => index + 1)
    );
  });
});
