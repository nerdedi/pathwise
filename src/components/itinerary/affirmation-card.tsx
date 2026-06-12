"use client";

import type { Affirmation } from "@/types/itinerary";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AffirmationCardProps {
  affirmations: Affirmation[];
  timing?: Affirmation["timing"];
}

const TIMING_LABELS: Record<Affirmation["timing"], string> = {
  before: "Before you go",
  during: "While you're there",
  overwhelmed: "If things feel hard",
  after: "Afterwards",
};

const TIMING_COLORS: Record<Affirmation["timing"], string> = {
  before: "from-sage-50 to-sage-100 border-sage-200",
  during: "from-lavender-50 to-lavender-100 border-lavender-200",
  overwhelmed: "from-calm-50 to-calm-100 border-calm-200",
  after: "from-warm-50 to-warm-100 border-warm-200",
};

export default function AffirmationCard({
  affirmations,
  timing,
}: AffirmationCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const filtered = timing
    ? affirmations.filter((a) => a.timing === timing)
    : affirmations;

  if (filtered.length === 0) return null;

  const grouped = filtered.reduce<Record<string, Affirmation[]>>((acc, a) => {
    if (!acc[a.timing]) acc[a.timing] = [];
    acc[a.timing].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([t, items]) => {
        const timingKey = t as Affirmation["timing"];
        return (
          <div key={t}>
            <p className="text-xs font-semibold text-sage-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-warm-400" />
              {TIMING_LABELS[timingKey]}
            </p>
            <div className="space-y-2">
              {items.map((affirmation, i) => (
                <motion.div
                  key={i}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    prefersReducedMotion ? { duration: 0 } : { delay: i * 0.08 }
                  }
                  className={`rounded-2xl border bg-gradient-to-br p-4 ${TIMING_COLORS[timingKey]}`}
                >
                  <p className="text-sm text-sage-800 leading-relaxed italic">
                    &ldquo;{affirmation.text}&rdquo;
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
