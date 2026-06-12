import { generateJson } from "@/lib/gemini";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/gemini", () => ({
  generateJson: vi.fn(),
}));

import { POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("social story assist route", () => {
  it("returns improved panel output", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      title: "I arrive calmly",
      text: "I arrive and take one breath.",
      supportTip: "I can pause before moving on.",
      keywords: ["arrive", "calm"],
      imagePrompt: "Simple calm arrival visual",
    });

    const response = await POST(
      new Request("http://localhost/api/social-story/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueName: "Calm Museum",
          panel: {
            title: "Arrive",
            text: "I arrive.",
          },
          goal: "calm",
          audience: "mixed",
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { panel: { title: string; text: string } };
    expect(payload.panel.title).toBe("I arrive calmly");
    expect(payload.panel.text).toContain("take one breath");
  });

  it("returns safe fallback when generated text is unsafe", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      title: "violent step",
      text: "This is violent",
    });

    const response = await POST(
      new Request("http://localhost/api/social-story/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueName: "Calm Museum",
          panel: {
            title: "Arrive",
            text: "I arrive.",
          },
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { panel: { title: string; text: string } };
    expect(payload.panel.title).toBe("Calm next step");
    expect(payload.panel.text).toContain("safe");
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/social-story/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueName: "" }),
      }) as never
    );

    expect(response.status).toBe(400);
  });
});
