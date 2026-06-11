"use client";

import { AlertTriangle, CheckCircle2, Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type RuntimeIssue = {
  key: string;
  message: string;
  severity: "warning" | "error";
};

type RuntimeHealth = {
  ok: boolean;
  issues: RuntimeIssue[];
};

const ISSUE_HINTS: Record<string, string> = {
  "supabase-auth": "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your local env file.",
  "ai-provider": "Set GROQ_API_KEY or GOOGLE_AI_API_KEY to enable itinerary and social-story generation.",
  "app-url": "Set NEXT_PUBLIC_APP_URL so shared links and metadata use your real host URL.",
};

export default function SetupPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<RuntimeHealth | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const payload = (await response.json()) as RuntimeHealth;

        if (cancelled) return;
        setHealth(payload);
      } catch {
        if (cancelled) return;
        setError("Could not load runtime diagnostics right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50 to-white">
      <nav className="bg-white border-b border-sage-100 px-4 h-14 flex items-center">
        <div className="flex items-center justify-between w-full max-w-3xl mx-auto">
          <Link href="/" className="text-sage-800 font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Runtime setup
          </Link>
          <Link href="/plan" className="text-sm text-sage-600 hover:text-sage-800">
            Back to planning
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-sage-900">Environment diagnostics</h1>
        <p className="text-sage-600 mt-1">
          Check what is configured and what might cause degraded experiences.
        </p>

        {loading && (
          <div className="mt-6 rounded-xl border border-sage-100 bg-white p-4 text-sage-600 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading runtime checks…
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && health && (
          <>
            <div className="mt-6 rounded-xl border border-sage-100 bg-white p-4">
              <p className="text-sm font-medium text-sage-800 flex items-center gap-2">
                {health.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-sage-600" /> Runtime checks passed
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-warm-600" /> Runtime checks need attention
                  </>
                )}
              </p>
              <p className="text-xs text-sage-500 mt-1">
                {health.issues.length === 0
                  ? "No issues detected."
                  : `${health.issues.length} item(s) detected.`}
              </p>
            </div>

            {health.issues.length > 0 && (
              <div className="mt-4 space-y-3">
                {health.issues.map((issue) => (
                  <div
                    key={`${issue.key}-${issue.message}`}
                    className="rounded-xl border border-warm-200 bg-warm-50 p-4"
                  >
                    <p className="text-sm font-semibold text-warm-800 capitalize">
                      {issue.severity}: {issue.key.replace(/-/g, " ")}
                    </p>
                    <p className="text-sm text-warm-800/90 mt-1">{issue.message}</p>
                    {ISSUE_HINTS[issue.key] && (
                      <p className="text-xs text-warm-800/80 mt-2">Suggested fix: {ISSUE_HINTS[issue.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
