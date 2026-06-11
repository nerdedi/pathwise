"use client";

import type { CrisisPlan } from "@/types/itinerary";
import type { SensoryProfile } from "@/types/sensory-profile";
import { HeartPulse } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface MoodCheckinProps {
  itineraryId: string;
  profile: SensoryProfile;
  crisisPlan: CrisisPlan;
}

export default function MoodCheckin({ itineraryId, profile, crisisPlan }: MoodCheckinProps) {
  const storageKey = `pathwise_mood_checkin_${itineraryId}`;
  const [energy, setEnergy] = useState(6);
  const [overwhelm, setOverwhelm] = useState(3);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { energy?: number; overwhelm?: number };
      if (typeof parsed.energy === "number") setEnergy(Math.max(1, Math.min(10, parsed.energy)));
      if (typeof parsed.overwhelm === "number") setOverwhelm(Math.max(1, Math.min(10, parsed.overwhelm)));
    } catch {
      // ignore invalid local storage
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify({ energy, overwhelm, updatedAt: new Date().toISOString() }));
  }, [energy, overwhelm, storageKey]);

  const adaptiveSupport = useMemo(() => {
    const strategies = [...profile.groundingTechniques, ...profile.copingStrategies].filter(Boolean);
    const reminders = [...crisisPlan.selfCareReminders, ...crisisPlan.steps].filter(Boolean);

    if (overwhelm >= 7 || energy <= 3) {
      return {
        tone: "high",
        title: "Let’s switch to a gentler plan",
        advice: [
          "Pause for 5–10 minutes before your next step.",
          "Use a quiet-space stop before the busiest leg.",
          "Ask for help early if things feel too intense.",
        ],
        strategies: (strategies.length ? strategies : reminders).slice(0, 4),
      } as const;
    }

    if (overwhelm >= 5 || energy <= 5) {
      return {
        tone: "medium",
        title: "A paced plan will help",
        advice: [
          "Keep short breaks between major steps.",
          "Choose the calmer route option if available.",
          "Check hydration and comfort items now.",
        ],
        strategies: (strategies.length ? strategies : reminders).slice(0, 3),
      } as const;
    }

    return {
      tone: "low",
      title: "You seem ready to go",
      advice: [
        "Keep your preferred supports easy to reach.",
        "Review one fallback plan in case things change.",
      ],
      strategies: (strategies.length ? strategies : reminders).slice(0, 2),
    } as const;
  }, [crisisPlan.selfCareReminders, crisisPlan.steps, energy, overwhelm, profile.copingStrategies, profile.groundingTechniques]);

  const toneClass =
    adaptiveSupport.tone === "high"
      ? "border-warm-200 bg-warm-50"
      : adaptiveSupport.tone === "medium"
        ? "border-lavender-200 bg-lavender-50"
        : "border-sage-200 bg-sage-50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-sage-600 mb-2 flex items-center gap-1.5">
        <HeartPulse className="w-3.5 h-3.5" />
        Mood check-in
      </p>
      <p className="text-sm font-semibold text-sage-900 mb-3">{adaptiveSupport.title}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs text-sage-700">
          Energy right now (1 low – 10 high)
          <input
            type="range"
            min={1}
            max={10}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="mt-1 w-full"
          />
          <span className="text-[11px] text-sage-500">Current: {energy}/10</span>
        </label>

        <label className="text-xs text-sage-700">
          Overwhelm right now (1 calm – 10 intense)
          <input
            type="range"
            min={1}
            max={10}
            value={overwhelm}
            onChange={(e) => setOverwhelm(Number(e.target.value))}
            className="mt-1 w-full"
          />
          <span className="text-[11px] text-sage-500">Current: {overwhelm}/10</span>
        </label>
      </div>

      <ul className="mt-3 space-y-1.5">
        {adaptiveSupport.advice.map((line) => (
          <li key={line} className="text-sm text-sage-700 flex gap-2">
            <span className="text-sage-400 mt-0.5">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {adaptiveSupport.strategies.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-600 mb-1">Your support strategies</p>
          <div className="flex flex-wrap gap-2">
            {adaptiveSupport.strategies.map((strategy) => (
              <span
                key={strategy}
                className="rounded-full border border-sage-200 bg-white px-3 py-1 text-xs text-sage-700"
              >
                {strategy}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
