"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildTransportSupportCards } from "@/lib/transport-support";
import { formatTime, minutesToDuration } from "@/lib/utils";
import type { TransportPlan } from "@/types/itinerary";
import type { EmergencyContact } from "@/types/sensory-profile";
import {
    BellRing,
    Bus,
    ChevronDown,
    ChevronUp,
    Clock,
    Footprints,
    LifeBuoy,
    MapPin,
    Phone,
    RefreshCw,
    Train,
    Users,
} from "lucide-react";
import { useState } from "react";

interface TransportSectionProps {
  plan: TransportPlan;
  direction: "to" | "from";
  venueName: string;
  supportCardName?: string;
  supportCardMessage?: string;
  emergencyContacts?: EmergencyContact[];
}

const MODE_ICONS = {
  train: Train,
  bus: Bus,
  "light-rail": Train,
  ferry: MapPin,
  walk: Footprints,
};

const SUPPORT_ICON_MAP = {
  navigation: MapPin,
  alert: BellRing,
  refresh: RefreshCw,
  crowd: Users,
  clock: Clock,
  bus: Bus,
  phone: Phone,
  help: LifeBuoy,
} as const;

export default function TransportSection({
  plan,
  direction,
  venueName,
  supportCardName,
  supportCardMessage,
  emergencyContacts = [],
}: TransportSectionProps) {
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(null);
  const supportCards = buildTransportSupportCards(plan, {
    venueName,
    direction,
    supportCardName,
    supportCardMessage,
    emergencyContacts,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Train className="w-4 h-4 text-calm-500" />
          {direction === "to" ? `Getting to ${venueName}` : `Getting home from ${venueName}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-xl border border-calm-100 bg-calm-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-calm-700 mb-2">
            Top travel supports
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {supportCards.map((card) => {
              const Icon = SUPPORT_ICON_MAP[card.icon];
              return (
                <div
                  key={card.id}
                  className="rounded-lg border border-calm-100 bg-white px-3 py-2.5"
                >
                  <p className="text-xs text-calm-700 font-semibold flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {card.priorityRank}. {card.title}
                  </p>
                  <p className="text-xs text-sage-600 mt-1 leading-relaxed">{card.detail}</p>
                </div>
              );
            })}
          </div>
        </div>

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
          {plan.routePreference && (
            <div className="flex items-center gap-1.5 text-sm text-lavender-700 bg-lavender-50 rounded-lg px-3 py-1.5 capitalize">
              🧭 {plan.routePreference} route
            </div>
          )}
          {typeof plan.stressScore === "number" && (
            <div className="flex items-center gap-1.5 text-sm text-warm-700 bg-warm-50 rounded-lg px-3 py-1.5">
              🌿 Stress score {plan.stressScore}/10
            </div>
          )}
        </div>

        {plan.journeyReminder && (
          <div className="mb-4 text-sm text-sage-700 bg-lavender-50 border border-lavender-100 rounded-xl px-4 py-3">
            {plan.journeyReminder}
          </div>
        )}

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
                      {(leg.levelBoarding || leg.onboardToilet || leg.liftStatus) && (
                        <div className="mt-1 space-y-0.5">
                          {typeof leg.levelBoarding === "boolean" && (
                            <p className="text-xs text-calm-600">♿ Level boarding {leg.levelBoarding ? "available" : "may need assistance"}</p>
                          )}
                          {typeof leg.onboardToilet === "boolean" && (
                            <p className="text-xs text-calm-600">🚻 On-board toilet {leg.onboardToilet ? "available" : "not confirmed"}</p>
                          )}
                          {leg.liftStatus && (
                            <p className="text-xs text-calm-600">🛗 Lift status: {leg.liftStatus}</p>
                          )}
                        </div>
                      )}
                      {leg.accessibilityNotes && (
                        <p className="text-xs text-calm-600 mt-0.5">
                          ♿ {leg.accessibilityNotes}
                        </p>
                      )}
                      {(leg.crowdingLevel || leg.noiseLevel) && (
                        <p className="text-xs text-sage-500 mt-0.5">
                          {leg.crowdingLevel && `Crowding: ${leg.crowdingLevel}`}
                          {leg.crowdingLevel && leg.noiseLevel && " · "}
                          {leg.noiseLevel && `Noise: ${leg.noiseLevel}`}
                        </p>
                      )}
                      {leg.disruptionInfo && (
                        <p className="text-xs text-warm-600 mt-0.5">⚠ {leg.disruptionInfo}</p>
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
                        onClick={() =>
                          setExpandedLegIndex((current) =>
                            current === i ? null : i
                          )
                        }
                        className="mt-1.5 text-xs text-sage-500 flex items-center gap-1 hover:text-sage-700 focus-calm"
                      >
                        {expandedLegIndex === i ? (
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

                  {expandedLegIndex === i &&
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

        {plan.stationWayfinding && plan.stationWayfinding.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">
              Station wayfinding
            </p>
            {plan.stationWayfinding.map((station) => (
              <div key={station.stationName} className="rounded-xl border border-sage-100 p-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-sage-800">{station.stationName}</p>
                    <p className="text-xs text-sage-500 mt-0.5">
                      {station.stepFreeAccess ? "Step-free access" : "Step-free access not confirmed"} · Lift {station.liftStatus}
                    </p>
                  </div>
                  <div className="text-right text-xs text-sage-500">
                    <p>{station.toilets ? "Toilets" : "No toilet info"}</p>
                    <p>{station.accessibleToilet ? "Accessible toilet" : "Accessible toilet unknown"}</p>
                  </div>
                </div>
                {station.notes && <p className="text-xs text-sage-500 mt-2">{station.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {plan.liveUpdates && plan.liveUpdates.length > 0 && (
          <div className="mt-4 rounded-xl border border-warm-100 bg-warm-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-warm-700 mb-1">Live updates</p>
            {plan.liveUpdates.map((update) => (
              <p key={update} className="text-xs text-warm-700">• {update}</p>
            ))}
          </div>
        )}

        {plan.reminders && plan.reminders.length > 0 && (
          <div className="mt-4 rounded-xl border border-calm-100 bg-calm-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-calm-700 mb-1">Travel reminders</p>
            {plan.reminders.map((reminder) => (
              <p key={reminder} className="text-xs text-calm-700">• {reminder}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
