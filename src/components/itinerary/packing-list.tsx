"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PackingItem } from "@/types/itinerary";
import { Backpack, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface PackingListProps {
  items: PackingItem[];
}

const CATEGORY_LABELS: Record<PackingItem["category"], { label: string; emoji: string }> = {
  sensory: { label: "Sensory support", emoji: "🎧" },
  comfort: { label: "Comfort items", emoji: "🧸" },
  medical: { label: "Medical", emoji: "💊" },
  practical: { label: "Practical", emoji: "🎒" },
  food: { label: "Food & drink", emoji: "🥤" },
};

const PRIORITY_ORDER: PackingItem["priority"][] = ["essential", "recommended", "optional"];

export default function PackingList({ items }: PackingListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (item: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  // Group by category
  const grouped = items.reduce<Record<string, PackingItem[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Sort within each category by priority
  Object.values(grouped).forEach((catItems) =>
    catItems.sort(
      (a, b) =>
        PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    )
  );

  const checkedCount = checked.size;
  const totalCount = items.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Backpack className="w-4 h-4 text-warm-500" />
            What to pack
          </span>
          {checkedCount > 0 && (
            <span className="text-xs font-normal text-sage-500">
              {checkedCount}/{totalCount} packed
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {Object.entries(grouped).map(([cat, catItems]) => {
          const meta = CATEGORY_LABELS[cat as PackingItem["category"]] || { label: cat, emoji: "📦" };
          return (
            <div key={cat}>
              <p className="text-xs font-semibold text-sage-600 uppercase tracking-wide mb-2">
                {meta.emoji} {meta.label}
              </p>
              <ul className="space-y-1.5">
                {catItems.map((item) => {
                  const isChecked = checked.has(item.item);
                  return (
                    <li key={item.item}>
                      <button
                        onClick={() => toggle(item.item)}
                        className={cn(
                          "w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all focus-calm",
                          isChecked
                            ? "bg-sage-50 opacity-60"
                            : "bg-white border border-sage-100 hover:border-sage-200"
                        )}
                        aria-pressed={isChecked}
                      >
                        <CheckCircle2
                          className={cn(
                            "w-4 h-4 mt-0.5 shrink-0 transition-colors",
                            isChecked ? "text-sage-500" : "text-sage-200"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isChecked ? "line-through text-sage-400" : "text-sage-800"
                              )}
                            >
                              {item.item}
                            </span>
                            {item.priority === "essential" && (
                              <span className="text-xs bg-red-100 text-red-700 rounded-full px-1.5 py-0.5">
                                essential
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-sage-500 mt-0.5">{item.reason}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
