import { isSupabaseAuthConfigured } from "@/lib/supabase/config";

export type RuntimeConfigIssue = {
  key: string;
  message: string;
  severity: "warning" | "error";
};

export function getRuntimeConfigIssues(): RuntimeConfigIssue[] {
  const issues: RuntimeConfigIssue[] = [];

  if (!isSupabaseAuthConfigured()) {
    issues.push({
      key: "supabase-auth",
      severity: "warning",
      message:
        "Supabase auth is not fully configured. Login, profile persistence, and shared-guide flows may be limited.",
    });
  }

  const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GOOGLE_AI_API_KEY?.trim());

  if (!hasGroq && !hasGemini) {
    issues.push({
      key: "ai-provider",
      severity: "warning",
      message:
        "No AI provider key is configured. Guide generation and social-story generation will fail until GROQ_API_KEY or GOOGLE_AI_API_KEY is set.",
    });
  }

  if (!process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    issues.push({
      key: "app-url",
      severity: "warning",
      message:
        "NEXT_PUBLIC_APP_URL is not set. Share links and metadata will fall back to localhost.",
    });
  }

  return issues;
}

export function isRuntimeConfigReady(): boolean {
  return getRuntimeConfigIssues().every((issue) => issue.severity !== "error");
}
