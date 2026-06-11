import type { SocialStoryPanel } from "@/types/itinerary";
import { describe, expect, it } from "vitest";
import {
  getSocialStoryVisual,
    getSocialStoryPanelContent,
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
  });

  it("derives a universal visual cue for a panel", () => {
    const visual = getSocialStoryVisual(basePanels[0], "en");

    expect(visual.icon).toBe("🚪");
    expect(visual.label).toBe("Arrival");
  });
});
