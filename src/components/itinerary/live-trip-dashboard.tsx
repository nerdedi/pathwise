"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { speakCalmText } from "@/lib/voice";
import { ArrowRightLeft, Bell, Bus, Flag, Headphones, LocateFixed, MapPinned, Siren, TimerReset, Train, Users, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";

interface LiveTripDashboardProps {
  venueName: string;
  quietTimes?: string;
  peakTimes?: string;
  enableVoice?: boolean;
}

export default function LiveTripDashboard({
  venueName,
  quietTimes,
  peakTimes,
  enableVoice = true,
}: LiveTripDashboardProps) {
  const [status, setStatus] = useState("Not started");
  const [latestPrompt, setLatestPrompt] = useState(
    "Tap a quick action during your trip for real-time guidance."
  );

  const baseContext = useMemo(() => {
    const details: string[] = [];
    if (quietTimes) details.push(`Calmer times: ${quietTimes}.`);
    if (peakTimes) details.push(`Busy times: ${peakTimes}.`);
    return details.join(" ");
  }, [peakTimes, quietTimes]);

  const pushPrompt = (nextStatus: string, message: string) => {
    setStatus(nextStatus);
    const full = `${message}${baseContext ? ` ${baseContext}` : ""}`.trim();
    setLatestPrompt(full);
    if (enableVoice) {
      speakCalmText(full, { lang: "en-AU", rate: 0.92, pitch: 0.95 });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">🧭 Live trip dashboard</CardTitle>
        <p className="text-xs text-sage-500 mt-1">
          Quick support prompts for right now while you travel to and around {venueName}.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="rounded-xl border border-sage-100 bg-sage-50 p-3">
          <p className="text-xs uppercase tracking-wide text-sage-600 font-semibold mb-1">Current status</p>
          <p className="text-sm text-sage-800 font-medium">{status}</p>
          <p className="text-sm text-sage-700 mt-2">{latestPrompt}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Arrived",
                `You have arrived at ${venueName}. Pause for one minute, orient to exits, and find the nearest calm zone before your next step.`
              )
            }
          >
            <Flag className="w-4 h-4" /> I have arrived
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "On bus",
                "You are on the bus. Keep your support items ready and set a reminder one stop before you need to get off."
              )
            }
          >
            <Bus className="w-4 h-4" /> I am on the bus
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "On train",
                "You are on the train. Stand near the doors one stop early if that feels safer, and keep your route visible."
              )
            }
          >
            <Train className="w-4 h-4" /> I am on the train
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Stop approaching",
                "Your stop is approaching. Gather your things now, take one breath, and move toward the exit calmly."
              )
            }
          >
            <Bell className="w-4 h-4" /> My stop is approaching
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Loud area nearby",
                "This area is likely loud and busy. Put on headphones if helpful, reduce pace, and move to the edge of the crowd."
              )
            }
          >
            <Headphones className="w-4 h-4" /> I am near a loud area
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Food court nearby",
                "This is likely a busier food-court zone. Use headphones, choose edge seating, and keep your visit short if needed."
              )
            }
          >
            <UtensilsCrossed className="w-4 h-4" /> I am near the food court
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Queue is long",
                "The queue is long right now. Step aside for two minutes, then choose: wait, switch lines, or do a calmer activity first."
              )
            }
          >
            <Users className="w-4 h-4" /> Queue is too long
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Need reset",
                "You are doing the right thing by pausing. Find a quieter corner, drink water, and choose one small next step."
              )
            }
          >
            <Siren className="w-4 h-4" /> I feel overwhelmed
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Re-orienting",
                "Use map signage and check your current landmark before moving. If unsure, ask staff for the quietest route."
              )
            }
          >
            <MapPinned className="w-4 h-4" /> Help me navigate now
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Need quiet exit",
                "Let’s use a quieter exit route now. Follow edge pathways, avoid central crowds, and ask staff for the calmest way out."
              )
            }
          >
            <ArrowRightLeft className="w-4 h-4" /> Find a quiet exit
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Location check",
                "Confirm your location and next target point before moving to reduce last-minute stress."
              )
            }
          >
            <LocateFixed className="w-4 h-4" /> Check my location
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            onClick={() =>
              pushPrompt(
                "Quick reset",
                "Take a 90-second reset: breathe out slowly, drop your shoulders, sip water, and pick one tiny next step."
              )
            }
          >
            <TimerReset className="w-4 h-4" /> 90-second reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
