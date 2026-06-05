"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CrisisPlan } from "@/types/itinerary";
import { AlertTriangle, DoorOpen, Heart, Phone } from "lucide-react";

interface OverwhelmedPlanProps {
  plan: CrisisPlan;
}

export default function OverwhelmedPlan({ plan }: OverwhelmedPlanProps) {
  return (
    <Card className="border-lavender-200 bg-lavender-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lavender-800 text-base">
          <AlertTriangle className="w-4 h-4 text-lavender-600" />
          If you feel overwhelmed
        </CardTitle>
        <p className="text-xs text-lavender-600 mt-1">
          It&rsquo;s okay to need a moment. Here&rsquo;s exactly what you can do.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step-by-step plan */}
        <div>
          <p className="text-xs font-semibold text-lavender-700 uppercase tracking-wide mb-2">
            Your simple plan
          </p>
          <ol className="space-y-2">
            {plan.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-sage-800">
                <span className="shrink-0 w-6 h-6 rounded-full bg-lavender-200 text-lavender-800 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Quiet rooms */}
        {plan.quietRooms.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              🤫 Quiet spaces at this venue
            </p>
            <ul className="space-y-1">
              {plan.quietRooms.map((room, i) => (
                <li key={i} className="text-sm text-sage-700 bg-sage-50 rounded-lg px-3 py-2">
                  {room}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Exits */}
        {plan.exits.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5" />
              Exits
            </p>
            <ul className="space-y-1">
              {plan.exits.map((exit, i) => (
                <li key={i} className="text-sm text-sage-700 bg-white rounded-lg px-3 py-2 border border-sage-100">
                  {exit}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Help desk */}
        <div className="bg-white rounded-xl border border-sage-100 p-3">
          <p className="text-xs font-medium text-sage-600 mb-1">Help desk location</p>
          <p className="text-sm text-sage-800">{plan.helpDeskLocation}</p>
        </div>

        {/* Phone */}
        {plan.venuePhone && (
          <a
            href={`tel:${plan.venuePhone}`}
            className="flex items-center gap-3 bg-sage-100 rounded-xl px-4 py-3 hover:bg-sage-200 transition-colors focus-calm"
            aria-label={`Call venue: ${plan.venuePhone}`}
          >
            <Phone className="w-4 h-4 text-sage-600" />
            <div>
              <p className="text-xs text-sage-500 font-medium">Call the venue</p>
              <p className="text-sm font-semibold text-sage-800">{plan.venuePhone}</p>
            </div>
          </a>
        )}

        {/* Self-care reminders */}
        {plan.selfCareReminders.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-pink-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              Remind yourself
            </p>
            <ul className="space-y-1.5">
              {plan.selfCareReminders.map((reminder, i) => (
                <li key={i} className="text-sm text-sage-700 italic">
                  &ldquo;{reminder}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
