import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();
const mockGenerateContent = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
        };
      }
    },
  };
});

describe("generateJson", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
    mockGenerateContent.mockReset();
    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
  });

  it("uses Groq when configured", async () => {
    process.env.GROQ_API_KEY = "groq-key";
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"ok":true}' } }],
    });

    const { generateJson } = await import("./gemini");
    const result = await generateJson("system", "user");

    expect(result).toEqual({ ok: true });
    expect(mockCreate).toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("falls back to Gemini when Groq is unavailable", async () => {
    process.env.GOOGLE_AI_API_KEY = "gemini-key";
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '{"ok":true,"provider":"gemini"}' },
    });

    const { generateJson } = await import("./gemini");
    const result = await generateJson("system", "user");

    expect(result).toEqual({ ok: true, provider: "gemini" });
    expect(mockGenerateContent).toHaveBeenCalled();
  });
});
