import { generateJson } from "@/lib/gemini";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordModerationEvent } from "@/lib/moderation-telemetry";

vi.mock("@/lib/gemini", () => ({
  generateJson: vi.fn(),
}));

vi.mock("@/lib/moderation-telemetry", () => ({
  recordModerationEvent: vi.fn(),
}));

import { __resetAssistRateLimitForTests, POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  __resetAssistRateLimitForTests();
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

  it("returns safe fallback when generated text includes terror-related language", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      title: "terror alert step",
      text: "This moment feels like terror.",
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

  it("returns safe fallback when generated text has copyright-risk terms", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      title: "Disney-style scene",
      text: "Use a marvel hero at the entrance",
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
    expect(vi.mocked(recordModerationEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        route: "/api/social-story/assist",
        trigger: "copyright",
      })
    );
  });

  it("returns 429 when assist request rate limit is exceeded", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      title: "I arrive calmly",
      text: "I arrive and take one breath.",
    });

    let status = 200;
    for (let i = 0; i < 31; i += 1) {
      const response = await POST(
        new Request("http://localhost/api/social-story/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.10" },
          body: JSON.stringify({
            venueName: "Calm Museum",
            panel: {
              title: "Arrive",
              text: "I arrive.",
            },
          }),
        }) as never
      );
      status = response.status;
      if (status === 429) break;
    }

    expect(status).toBe(429);
    expect(vi.mocked(recordModerationEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        route: "/api/social-story/assist",
        trigger: "rate-limit",
      })
    );
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
