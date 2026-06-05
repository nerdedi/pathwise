"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime, minutesToDuration } from "@/lib/utils";
import type { TransportPlan } from "@/types/itinerary";
import { Bus, ChevronDown, ChevronUp, Clock, Footprints, MapPin, Train } from "lucide-react";
import { useState } from "react";

interface TransportSectionProps {
  plan: TransportPlan;
  direction: "to" | "from";
  venueName: string;
}

const MODE_ICONS = {
  train: Train,
  bus: Bus,
  "light-rail": Train,
  ferry: MapPin,
  walk: Footprints,
};

export default function TransportSection({ plan, direction, venueName }: TransportSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Train className="w-4 h-4 text-calm-500" />
          {direction === "to" ? `Getting to ${venueName}` : `Getting home from ${venueName}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-sm text-sage-700 bg-sage-50 rounded-lg px-3 py-1.5">
            <Clock className="w-3.5 h-3.5" />
            {minutesToDuration(plan.totalDurationMinutes)} total
          </div>
          <div className="flex items-center gap-1.5 text-sm text-sage-700 bg-sage-50 rounded-lg px-3 py-1.5">
            <Footprints className="w-3.5 h-3.5" />
            ~{plan.totalApproximateSteps.toLocaleString()} steps
          </div>
          {plan.accessibleRoute && (
            <div className="flex items-center gap-1.5 text-sm text-calm-700 bg-calm-50 rounded-lg px-3 py-1.5">
              ♿ Accessible route
            </div>
          )}
        </div>

        {/* Journey legs */}
        <div className="space-y-0">
          {plan.legs.map((leg, i) => {
            const Icon = MODE_ICONS[leg.mode as keyof typeof MODE_ICONS] ?? MapPin;
            const isLast = i === plan.legs.length - 1;

            return (
              <div key={i} className="relative pl-8">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-3.5 top-7 bottom-0 w-px bg-sage-200" />
                )}

                {/* Mode icon circle */}
                <div className="absolute left-0 top-3 w-7 h-7 rounded-full bg-white border-2 border-sage-300 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-sage-600" />
                </div>

                <div className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-sage-800 capitalize">
                        {leg.mode === "walk" ? "Walk" : leg.mode}
                        {leg.line && ` — ${leg.line}`}
                      </p>
                      <p className="text-xs text-sage-500">
                        {leg.from} → {leg.to}
                      </p>
                      {leg.platform && (
                        <p className="text-xs text-sage-500">
                          Platform {leg.platform}
                        </p>
                      )}
                      {leg.accessibilityNotes && (
                        <p className="text-xs text-calm-600 mt-0.5">
                          ♿ {leg.accessibilityNotes}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-sage-500">
                        {formatTime(leg.departureTime)} → {formatTime(leg.arrivalTime)}
                      </p>
                      <p className="text-xs text-sage-400">
                        {minutesToDuration(leg.durationMinutes)}
                      </p>
                      {leg.approximateSteps && (
                        <p className="text-xs text-sage-400">
                          ~{leg.approximateSteps} steps
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Step-by-step walking instructions */}
                  {leg.mode === "walk" &&
                    leg.stepByStepInstructions &&
                    leg.stepByStepInstructions.length > 0 && (
                      <button
                        onClick={() => setExpanded((e) => !e)}
                        className="mt-1.5 text-xs text-sage-500 flex items-center gap-1 hover:text-sage-700 focus-calm"
                      >
                        {expanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" /> Hide directions
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" /> Show step-by-step
                          </>
                        )}
                      </button>
                    )}

                  {expanded &&
                    leg.stepByStepInstructions?.map((step, si) => (
                      <p key={si} className="text-xs text-sage-600 mt-1 ml-2">
                        {si + 1}. {step}
                      </p>
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        {plan.notes && (
          <div className="mt-2 text-xs text-sage-500 bg-sage-50 rounded-lg px-3 py-2">
            {plan.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
