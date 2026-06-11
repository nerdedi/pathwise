"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    buildAlternativeRouteOptions,
    buildPostTransitWalkingGuidance,
    buildPreTripAlerts,
    buildTransportSupportCards,
    buildTripOptimisationTips,
    type TransportTripMemory,
} from "@/lib/transport-support";
  import { speakCalmText } from "@/lib/voice";
import { formatTime, minutesToDuration } from "@/lib/utils";
import type { TransportPlan } from "@/types/itinerary";
import type { EmergencyContact } from "@/types/sensory-profile";
import {
    AlertTriangle,
    BellRing,
    Bus,
    Camera,
    ChevronDown,
    ChevronUp,
    Clock,
    Footprints,
    LifeBuoy,
    LocateFixed,
    MapPin,
    Mic,
    MicOff,
    Phone,
    RefreshCw,
    Route,
    Sparkles,
    Train,
    Users,
    Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface TransportSectionProps {
  itineraryId: string;
  plan: TransportPlan;
  direction: "to" | "from";
  venueName: string;
  supportCardName?: string;
  supportCardMessage?: string;
  emergencyContacts?: EmergencyContact[];
  wantsVoiceAssistance?: boolean;
  copingStrategies?: string[];
  groundingTechniques?: string[];
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
  itineraryId,
  plan,
  direction,
  venueName,
  supportCardName,
  supportCardMessage,
  emergencyContacts = [],
  wantsVoiceAssistance = true,
  copingStrategies = [],
  groundingTechniques = [],
}: TransportSectionProps) {
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(null);
  const [opalBalance, setOpalBalance] = useState("");
  const [opalThreshold, setOpalThreshold] = useState("15");
  const [voiceEnabled, setVoiceEnabled] = useState(wantsVoiceAssistance);
  const [trackingLocation, setTrackingLocation] = useState(false);
  const [geoStatus, setGeoStatus] = useState("Location is off");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [journeyPhotos, setJourneyPhotos] = useState<string[]>([]);
  const [reflectionStress, setReflectionStress] = useState(5);
  const [reflectionCrowding, setReflectionCrowding] = useState<"low" | "medium" | "high">("medium");
  const [reflectionNote, setReflectionNote] = useState("");
  const [tripMemories, setTripMemories] = useState<TransportTripMemory[]>([]);
  const locationWatchRef = useRef<number | null>(null);

  const photoStorageKey = `pathwise_transport_photos_${itineraryId}_${direction}`;
  const memoryStorageKey = `pathwise_transport_memories_${itineraryId}_${direction}`;

  const supportCards = useMemo(
    () =>
      buildTransportSupportCards(plan, {
        venueName,
        direction,
        supportCardName,
        supportCardMessage,
        emergencyContacts,
      }),
    [direction, emergencyContacts, plan, supportCardMessage, supportCardName, venueName]
  );

  const preTripAlerts = useMemo(() => buildPreTripAlerts(plan, venueName), [plan, venueName]);
  const alternatives = useMemo(() => buildAlternativeRouteOptions(plan), [plan]);
  const postTransitWalking = useMemo(
    () => buildPostTransitWalkingGuidance(plan, direction, venueName),
    [direction, plan, venueName]
  );
  const optimisationTips = useMemo(
    () => buildTripOptimisationTips(plan, tripMemories),
    [plan, tripMemories]
  );

  const lowBalanceThreshold = Number(opalThreshold) || 0;
  const currentBalance = Number(opalBalance);
  const isOpalLow = Number.isFinite(currentBalance) && currentBalance <= lowBalanceThreshold;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedPhotos = window.localStorage.getItem(photoStorageKey);
    if (storedPhotos) {
      try {
        setJourneyPhotos(JSON.parse(storedPhotos) as string[]);
      } catch {
        setJourneyPhotos([]);
      }
    }

    const storedMemories = window.localStorage.getItem(memoryStorageKey);
    if (storedMemories) {
      try {
        setTripMemories(JSON.parse(storedMemories) as TransportTripMemory[]);
      } catch {
        setTripMemories([]);
      }
    }

    return () => {
      if (typeof window !== "undefined" && locationWatchRef.current !== null) {
        window.navigator.geolocation.clearWatch(locationWatchRef.current);
      }
      setTrackingLocation(false);
    };
  }, [memoryStorageKey, photoStorageKey]);

  const speak = (message: string) => {
    if (!voiceEnabled) {
      return;
    }

    speakCalmText(message, { lang: "en-AU", rate: 0.9, pitch: 0.9 });
  };

  const toggleLiveLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in window.navigator)) {
      setGeoStatus("Location is not available in this browser");
      return;
    }

    if (locationWatchRef.current !== null) {
      window.navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
      setTrackingLocation(false);
      setGeoStatus("Location is off");
      return;
    }

    setGeoStatus("Finding your location…");
    locationWatchRef.current = window.navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGeoStatus("Location updates are on");
        setTrackingLocation(true);
      },
      () => {
        setGeoStatus("Could not access location");
        setTrackingLocation(false);
      },
      {
        enableHighAccuracy: true,
      }
    );
  };

  const onPhotoUpload = async (files: FileList | null) => {
    if (!files || typeof window === "undefined") return;

    const images = await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          })
      )
    );

    const nextPhotos = [...images, ...journeyPhotos].slice(0, 12);
    setJourneyPhotos(nextPhotos);
    window.localStorage.setItem(photoStorageKey, JSON.stringify(nextPhotos));
  };

  const saveTripReflection = () => {
    if (typeof window === "undefined") return;

    const entry: TransportTripMemory = {
      recordedAt: new Date().toISOString(),
      stressScore: reflectionStress,
      crowdingLevel: reflectionCrowding,
      note: reflectionNote.trim() || undefined,
    };

    const nextMemories = [entry, ...tripMemories].slice(0, 25);
    setTripMemories(nextMemories);
    window.localStorage.setItem(memoryStorageKey, JSON.stringify(nextMemories));
    setReflectionNote("");
  };

  const nearestKnownStop = useMemo(() => {
    const transitLegs = plan.legs.filter((leg) => leg.mode !== "walk");
    if (!transitLegs.length) return "No stop data available";
    return direction === "to" ? transitLegs[0].from : transitLegs[transitLegs.length - 1].to;
  }, [direction, plan.legs]);

  const anxietySupport = useMemo(() => {
    const techniques = [...groundingTechniques, ...copingStrategies].filter(Boolean);
    if (techniques.length > 0) {
      return techniques.slice(0, 3);
    }

    return ["Take 3 slow breaths", "Look for a quieter area", "Message a trusted contact"];
  }, [copingStrategies, groundingTechniques]);

  const journeyEffort = useMemo(() => {
    const totalWalkMinutes = plan.legs
      .filter((leg) => leg.mode === "walk")
      .reduce((sum, leg) => sum + leg.durationMinutes, 0);

    const weightedLoad =
      plan.totalDurationMinutes +
      Math.round(plan.totalApproximateSteps / 120) +
      totalWalkMinutes * 1.6 +
      (plan.stressScore ?? 0) * 5;

    if (weightedLoad <= 90) {
      return {
        label: "Gentle effort",
        fitness: "Suitable for most energy levels",
        breakSuggestion: "Plan one short reset break if you want one.",
      };
    }

    if (weightedLoad <= 150) {
      return {
        label: "Moderate effort",
        fitness: "Some steady walking and pacing helpful",
        breakSuggestion: "Plan a 5–10 minute reset break around halfway.",
      };
    }

    return {
      label: "Higher effort",
      fitness: "Higher physical and emotional load expected",
      breakSuggestion:
        "Plan regular reset breaks every 20–30 minutes, with a quieter checkpoint before the final leg.",
    };
  }, [plan.legs, plan.stressScore, plan.totalApproximateSteps, plan.totalDurationMinutes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Train className="w-4 h-4 text-calm-500" />
          {direction === "to" ? `Getting to ${venueName}` : `Getting home from ${venueName}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-xl border border-lavender-100 bg-lavender-50/50 p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wide text-lavender-700 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" /> Voice assistance
            </p>
            <button
              type="button"
              onClick={() => setVoiceEnabled((value) => !value)}
              className="text-xs rounded-md border border-lavender-200 bg-white px-2.5 py-1 text-lavender-700"
            >
              {voiceEnabled ? "Voice on" : "Voice off"}
            </button>
          </div>
          <p className="text-xs text-sage-600 mt-2">Tap any support card to hear it read out loud.</p>
        </div>

        <div className="mb-4 rounded-xl border border-warm-100 bg-warm-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-700 mb-2 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Opal card check
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="text-xs text-sage-600">
              Current balance (AUD)
              <input
                type="number"
                min="0"
                step="0.01"
                value={opalBalance}
                onChange={(e) => setOpalBalance(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-warm-200 bg-white px-2.5 text-sm text-sage-700"
              />
            </label>
            <label className="text-xs text-sage-600">
              Low-balance alert threshold
              <input
                type="number"
                min="0"
                step="0.01"
                value={opalThreshold}
                onChange={(e) => setOpalThreshold(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-warm-200 bg-white px-2.5 text-sm text-sage-700"
              />
            </label>
          </div>
          {isOpalLow && (
            <p className="mt-2 text-xs text-warm-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Low balance alert: top up before travelling.
            </p>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-sage-100 bg-sage-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-700 mb-2">Pre-trip checklist</p>
          <div className="space-y-2">
            {preTripAlerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => speak(`${alert.title}. ${alert.detail}`)}
                className="w-full rounded-lg border border-sage-100 bg-white px-3 py-2 text-left"
              >
                <p className="text-xs font-semibold text-sage-700">{alert.title}</p>
                <p className="text-xs text-sage-600 mt-0.5">{alert.detail}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-calm-100 bg-calm-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-calm-700 mb-2">Top travel supports</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {supportCards.map((card) => {
              const Icon = SUPPORT_ICON_MAP[card.icon];
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => speak(`${card.title}. ${card.detail}`)}
                  className="rounded-lg border border-calm-100 bg-white px-3 py-2.5 text-left"
                >
                  <p className="text-xs text-calm-700 font-semibold flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {card.priorityRank}. {card.title}
                  </p>
                  <p className="text-xs text-sage-600 mt-1 leading-relaxed">{card.detail}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-warm-100 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Anxiety support
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {anxietySupport.map((tip) => (
              <button
                key={tip}
                type="button"
                onClick={() => speak(tip)}
                className="rounded-lg border border-warm-100 bg-warm-50 px-2.5 py-2 text-xs text-warm-700 text-left"
              >
                {tip}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-lavender-100 bg-white p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wide text-lavender-700 flex items-center gap-1.5">
              <LocateFixed className="w-3.5 h-3.5" /> Real-time location
            </p>
            <button
              type="button"
              onClick={toggleLiveLocation}
              className="text-xs rounded-md border border-lavender-200 px-2.5 py-1 text-lavender-700 bg-lavender-50"
            >
              {trackingLocation ? "Stop location" : "Start location"}
            </button>
          </div>
          <p className="text-xs text-sage-600 mt-1.5">{geoStatus}</p>
          {currentLocation && (
            <p className="text-xs text-sage-500 mt-1">
              Lat {currentLocation.lat.toFixed(5)} · Lng {currentLocation.lng.toFixed(5)} · ±{Math.round(currentLocation.accuracy)}m
            </p>
          )}
          <p className="text-xs text-sage-500 mt-1">Nearest known stop: {nearestKnownStop}</p>
        </div>

        <div className="mb-4 rounded-xl border border-calm-100 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-calm-700 mb-2 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5" /> Alternative routes when disrupted
          </p>
          <div className="space-y-2">
            {alternatives.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => speak(`${option.title}. ${option.detail}`)}
                className="w-full rounded-lg border border-calm-100 bg-calm-50 px-3 py-2 text-left"
              >
                <p className="text-xs font-semibold text-calm-700">{option.title}</p>
                <p className="text-xs text-sage-600 mt-0.5">{option.detail}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-sage-100 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-700 mb-2">After public transport: walking guidance</p>
          <div className="space-y-2">
            {postTransitWalking.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => speak(`${item.title}. ${item.detail}`)}
                className="w-full rounded-lg border border-sage-100 bg-sage-50 px-3 py-2 text-left"
              >
                <p className="text-xs font-semibold text-sage-700">{item.title}</p>
                <p className="text-xs text-sage-600 mt-0.5">{item.detail}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-lavender-100 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-lavender-700 mb-2 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Journey photo reminders
          </p>
          <label className="inline-flex items-center gap-2 rounded-md border border-lavender-200 px-2.5 py-1.5 text-xs text-lavender-700 cursor-pointer bg-lavender-50">
            Add stop/service photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => void onPhotoUpload(e.target.files)}
            />
          </label>
          {journeyPhotos.length > 0 ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {journeyPhotos.map((photo, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${photo.slice(0, 25)}-${index}`}
                  src={photo}
                  alt={`Journey reminder ${index + 1}`}
                  className="h-20 w-full object-cover rounded-lg border border-lavender-100"
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-sage-500 mt-2">No photos saved yet.</p>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-calm-100 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-calm-700 mb-2">Optimise future trips</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="text-xs text-sage-600">
              Stress score (1-10)
              <input
                type="range"
                min={1}
                max={10}
                value={reflectionStress}
                onChange={(e) => setReflectionStress(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <label className="text-xs text-sage-600">
              Crowding felt
              <select
                value={reflectionCrowding}
                onChange={(e) =>
                  setReflectionCrowding(
                    e.target.value === "low"
                      ? "low"
                      : e.target.value === "high"
                        ? "high"
                        : "medium"
                  )
                }
                className="mt-1 h-9 w-full rounded-md border border-calm-200 bg-white px-2.5 text-sm text-sage-700"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="text-xs text-sage-600">
              Optional note
              <input
                type="text"
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-calm-200 bg-white px-2.5 text-sm text-sage-700"
                placeholder="What helped?"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={saveTripReflection}
            className="mt-2 text-xs rounded-md border border-calm-200 bg-calm-50 px-2.5 py-1 text-calm-700"
          >
            Save trip reflection
          </button>
          <div className="mt-2 space-y-2">
            {optimisationTips.map((tip) => (
              <button
                key={tip.id}
                type="button"
                onClick={() => speak(`${tip.title}. ${tip.detail}`)}
                className="w-full rounded-lg border border-calm-100 bg-calm-50 px-3 py-2 text-left"
              >
                <p className="text-xs font-semibold text-calm-700">{tip.title}</p>
                <p className="text-xs text-sage-600 mt-0.5">{tip.detail}</p>
              </button>
            ))}
          </div>
        </div>

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
          <div className="flex items-center gap-1.5 text-sm text-sky-700 bg-sky-50 rounded-lg px-3 py-1.5">
            ⚡ {journeyEffort.label}
          </div>
        </div>

        {plan.journeyReminder && (
          <div className="mb-4 text-sm text-sage-700 bg-lavender-50 border border-lavender-100 rounded-xl px-4 py-3">
            {plan.journeyReminder}
          </div>
        )}

        <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 mb-1">Energy and pacing</p>
          <p className="text-xs text-sage-700">{journeyEffort.fitness}</p>
          <p className="text-xs text-sage-700 mt-1">{journeyEffort.breakSuggestion}</p>
        </div>

        <div className="space-y-0">
          {plan.legs.map((leg, i) => {
            const Icon = MODE_ICONS[leg.mode as keyof typeof MODE_ICONS] ?? MapPin;
            const isLast = i === plan.legs.length - 1;

            return (
              <div key={`${leg.mode}-${leg.from}-${leg.to}-${i}`} className="relative pl-8">
                {!isLast && <div className="absolute left-3.5 top-7 bottom-0 w-px bg-sage-200" />}

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
                      {leg.platform && <p className="text-xs text-sage-500">Platform {leg.platform}</p>}
                      {(leg.levelBoarding || leg.onboardToilet || leg.liftStatus) && (
                        <div className="mt-1 space-y-0.5">
                          {typeof leg.levelBoarding === "boolean" && (
                            <p className="text-xs text-calm-600">♿ Level boarding {leg.levelBoarding ? "available" : "may need assistance"}</p>
                          )}
                          {typeof leg.onboardToilet === "boolean" && (
                            <p className="text-xs text-calm-600">🚻 On-board toilet {leg.onboardToilet ? "available" : "not confirmed"}</p>
                          )}
                          {leg.liftStatus && <p className="text-xs text-calm-600">🛗 Lift status: {leg.liftStatus}</p>}
                        </div>
                      )}
                      {leg.accessibilityNotes && <p className="text-xs text-calm-600 mt-0.5">♿ {leg.accessibilityNotes}</p>}
                      {(leg.crowdingLevel || leg.noiseLevel) && (
                        <p className="text-xs text-sage-500 mt-0.5">
                          {leg.crowdingLevel && `Crowding: ${leg.crowdingLevel}`}
                          {leg.crowdingLevel && leg.noiseLevel && " · "}
                          {leg.noiseLevel && `Noise: ${leg.noiseLevel}`}
                        </p>
                      )}
                      {leg.disruptionInfo && <p className="text-xs text-warm-600 mt-0.5">⚠ {leg.disruptionInfo}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-sage-500">
                        {formatTime(leg.departureTime)} → {formatTime(leg.arrivalTime)}
                      </p>
                      <p className="text-xs text-sage-400">{minutesToDuration(leg.durationMinutes)}</p>
                      {leg.approximateSteps && <p className="text-xs text-sage-400">~{leg.approximateSteps} steps</p>}
                    </div>
                  </div>

                  {leg.mode === "walk" && leg.stepByStepInstructions && leg.stepByStepInstructions.length > 0 && (
                    <button
                      onClick={() => setExpandedLegIndex((current) => (current === i ? null : i))}
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
                      <p key={`${step}-${si}`} className="text-xs text-sage-600 mt-1 ml-2">
                        {si + 1}. {step}
                      </p>
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        {plan.notes && <div className="mt-2 text-xs text-sage-500 bg-sage-50 rounded-lg px-3 py-2">{plan.notes}</div>}

        {plan.stationWayfinding && plan.stationWayfinding.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">Station wayfinding</p>
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

        <div className="mt-4 rounded-xl border border-sage-100 bg-sage-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-700 mb-1 flex items-center gap-1.5">
            <LifeBuoy className="w-3.5 h-3.5" /> Quick support
          </p>
          <div className="flex flex-wrap gap-2">
            {emergencyContacts.slice(0, 2).map((contact) => (
              <a
                key={`${contact.name}-${contact.phone}`}
                href={`tel:${contact.phone}`}
                className="text-xs rounded-md border border-sage-200 bg-white px-2.5 py-1 text-sage-700"
              >
                Call {contact.name}
              </a>
            ))}
            {supportCardMessage && (
              <button
                type="button"
                onClick={() => speak(supportCardMessage)}
                className="text-xs rounded-md border border-sage-200 bg-white px-2.5 py-1 text-sage-700 flex items-center gap-1"
              >
                {voiceEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />} Read support card
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
