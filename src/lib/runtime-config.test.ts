import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseAuthConfigured: vi.fn(),
}));

import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import { getRuntimeConfigIssues, isRuntimeConfigReady } from "./runtime-config";

describe("getRuntimeConfigIssues", () => {
  it("reports missing AI and auth configuration", () => {
    vi.mocked(isSupabaseAuthConfigured).mockReturnValue(false);

    const originalGroq = process.env.GROQ_API_KEY;
    const originalGemini = process.env.GOOGLE_AI_API_KEY;
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const issues = getRuntimeConfigIssues();

    expect(issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining(["supabase-auth", "ai-provider", "app-url"])
    );

    process.env.GROQ_API_KEY = originalGroq;
    process.env.GOOGLE_AI_API_KEY = originalGemini;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("stays quiet when core configuration exists", () => {
    vi.mocked(isSupabaseAuthConfigured).mockReturnValue(true);

    const originalGroq = process.env.GROQ_API_KEY;
    const originalGemini = process.env.GOOGLE_AI_API_KEY;
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    process.env.GROQ_API_KEY = "test-groq";
    delete process.env.GOOGLE_AI_API_KEY;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const issues = getRuntimeConfigIssues();

    expect(issues.some((issue) => issue.key === "ai-provider")).toBe(false);
    expect(issues.some((issue) => issue.key === "supabase-auth")).toBe(false);

    process.env.GROQ_API_KEY = originalGroq;
    process.env.GOOGLE_AI_API_KEY = originalGemini;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("accepts Gemini key as AI provider but still flags blank app url", () => {
    vi.mocked(isSupabaseAuthConfigured).mockReturnValue(true);

    const originalGroq = process.env.GROQ_API_KEY;
    const originalGemini = process.env.GOOGLE_AI_API_KEY;
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    delete process.env.GROQ_API_KEY;
    process.env.GOOGLE_AI_API_KEY = "gemini-key";
    process.env.NEXT_PUBLIC_APP_URL = "   ";

    const issues = getRuntimeConfigIssues();

    expect(issues.some((issue) => issue.key === "ai-provider")).toBe(false);
    expect(issues.some((issue) => issue.key === "app-url")).toBe(true);

    process.env.GROQ_API_KEY = originalGroq;
    process.env.GOOGLE_AI_API_KEY = originalGemini;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("treats warning-only configuration as runtime ready", () => {
    vi.mocked(isSupabaseAuthConfigured).mockReturnValue(false);

    const originalGroq = process.env.GROQ_API_KEY;
    const originalGemini = process.env.GOOGLE_AI_API_KEY;
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(isRuntimeConfigReady()).toBe(true);

    process.env.GROQ_API_KEY = originalGroq;
    process.env.GOOGLE_AI_API_KEY = originalGemini;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });
});
