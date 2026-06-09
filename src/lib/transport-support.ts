import type { TransportPlan } from "@/types/itinerary";
import type { EmergencyContact } from "@/types/sensory-profile";

export type TransportSupportIcon =
  | "navigation"
  | "alert"
  | "refresh"
  | "crowd"
  | "clock"
  | "bus"
  | "phone"
  | "help";

export interface TransportSupportCard {
  id: string;
  title: string;
  detail: string;
  icon: TransportSupportIcon;
  priorityRank: number;
}

export interface TransportSupportContext {
  venueName: string;
  direction: "to" | "from";
  supportCardName?: string;
  supportCardMessage?: string;
  emergencyContacts?: EmergencyContact[];
}

export interface TransportMicroAlert {
  id: string;
  title: string;
  detail: string;
}

export interface TransportTripMemory {
  recordedAt: string;
  stressScore: number;
  crowdingLevel: "low" | "medium" | "high";
  note?: string;
}

function routeEndText(plan: TransportPlan, direction: "to" | "from", venueName: string) {
  if (direction === "to") {
    return `the entrance for ${venueName}`;
  }
  return plan.toVenue || "your destination";
}

function fallbackFirstMile(plan: TransportPlan) {
  const firstLeg = plan.legs[0];
  if (!firstLeg) return "Follow signs to the first stop.";
  return `Start at ${firstLeg.from}. Follow signs to your first ${firstLeg.mode === "walk" ? "transport stop" : firstLeg.mode}.`;
}

function crowdLevelLabel(plan: TransportPlan) {
  const crowdedLeg = plan.legs.find((leg) => leg.crowdingLevel === "high");
  if (crowdedLeg) {
    return `Crowding may be high near ${crowdedLeg.from}. Use a quieter alternative if needed.`;
  }

  if (plan.routePreference === "quietest") {
    return "This route prefers quieter services when possible.";
  }

  return "Check service crowd levels before boarding and wait for a calmer option if needed.";
}

function disruptionGuidance(plan: TransportPlan) {
  const disruption = plan.legs.find((leg) => leg.disruptionInfo)?.disruptionInfo;
  if (disruption) {
    return `${disruption} If plans change, recalculate from your current stop.`;
  }

  if (plan.liveUpdates?.length) {
    return "Watch live updates and switch early if timing changes.";
  }

  return "If something changes, pause and recalculate from your current stop.";
}

function stopAlertText(plan: TransportPlan) {
  const transitLegs = plan.legs.filter((leg) => leg.mode !== "walk");
  const finalTransit = transitLegs[transitLegs.length - 1] ?? plan.legs[plan.legs.length - 1];
  if (!finalTransit) {
    return "Track your stop and prepare one stop early.";
  }

  return `Get ready one stop early for ${finalTransit.to}.`;
}

function planningReminder(plan: TransportPlan) {
  if (plan.journeyReminder) {
    return plan.journeyReminder;
  }

  if (plan.reminders?.length) {
    return plan.reminders[0];
  }

  return "Set a leave-now alert so you can start calmly and on time.";
}

function liveEtaText(plan: TransportPlan) {
  if (plan.liveUpdates?.length) {
    return plan.liveUpdates[0];
  }

  return "Check live vehicle location and ETA before heading to your stop.";
}

function panicSupportText(context: TransportSupportContext) {
  const firstContact = context.emergencyContacts?.[0];
  if (firstContact?.name && firstContact.phone) {
    return `If you panic, call ${firstContact.name} at ${firstContact.phone}.`;
  }

  if (context.supportCardName && context.supportCardMessage) {
    return `${context.supportCardName}: ${context.supportCardMessage}`;
  }

  return "If you panic, use your support card or contact a trusted person quickly.";
}

export function buildPreTripAlerts(plan: TransportPlan, venueName: string): TransportMicroAlert[] {
  const firstLeg = plan.legs[0];
  const firstTransitLeg = plan.legs.find((leg) => leg.mode !== "walk");

  return [
    {
      id: "pack-bag",
      title: "Pack your bag",
      detail: "Pack sensory supports, water, and your travel card before leaving.",
    },
    {
      id: "leave-alert",
      title: "Leave on time",
      detail: firstLeg
        ? `Plan to start by ${firstLeg.departureTime} so you can travel at a calm pace.`
        : "Set a leave-now alarm so you can travel at a calm pace.",
    },
    {
      id: "nearest-station",
      title: "Find your nearest station or stop",
      detail: firstTransitLeg
        ? `Head toward ${firstTransitLeg.from} to begin your trip to ${venueName}.`
        : "Use map signage to reach the nearest station or stop.",
    },
  ];
}

export function buildAlternativeRouteOptions(plan: TransportPlan): TransportMicroAlert[] {
  const hasDisruption = plan.legs.some((leg) => Boolean(leg.disruptionInfo));
  const highCrowding = plan.legs.some((leg) => leg.crowdingLevel === "high");

  const options: TransportMicroAlert[] = [];

  if (hasDisruption) {
    options.push({
      id: "reroute-now",
      title: "Reroute from your current stop",
      detail: "Use live updates and choose the next available service from where you are now.",
    });
  }

  if (highCrowding || plan.routePreference !== "quietest") {
    options.push({
      id: "quieter-service",
      title: "Choose a quieter service",
      detail: "Wait one service cycle for lower crowding and reduced sensory load.",
    });
  }

  options.push({
    id: "accessibility-route",
    title: "Use an accessibility-first route",
    detail: "Prefer stations with confirmed lifts and step-free access.",
  });

  return options;
}

export function buildPostTransitWalkingGuidance(
  plan: TransportPlan,
  direction: "to" | "from",
  venueName: string
): TransportMicroAlert[] {
  const finalWalk = [...plan.legs].reverse().find((leg) => leg.mode === "walk");
  const destination = direction === "to" ? venueName : plan.toVenue;

  if (!finalWalk) {
    return [
      {
        id: "final-walk",
        title: "Walk to your destination",
        detail: `Follow street signage from the final stop to ${destination}.`,
      },
    ];
  }

  const firstStep = finalWalk.stepByStepInstructions?.[0];
  const stepCount = finalWalk.stepByStepInstructions?.length ?? 0;

  return [
    {
      id: "final-walk-overview",
      title: "Final walking segment",
      detail: `Walk from ${finalWalk.from} to ${finalWalk.to} (${finalWalk.durationMinutes} minutes).`,
    },
    {
      id: "final-walk-first-step",
      title: "First walking step",
      detail: firstStep
        ? firstStep
        : `Follow the safest marked path from ${finalWalk.from}.`,
    },
    {
      id: "final-walk-steps",
      title: "Step count guidance",
      detail:
        stepCount > 0
          ? `${stepCount} step-by-step walking instructions are available in this guide.`
          : "Use crossings and wayfinding signs to stay on route.",
    },
  ];
}

export function buildTripOptimisationTips(
  plan: TransportPlan,
  memories: TransportTripMemory[]
): TransportMicroAlert[] {
  if (!memories.length) {
    return [
      {
        id: "optimize-baseline",
        title: "Build your travel baseline",
        detail: "Save one or two trip reflections to get personalised route suggestions.",
      },
    ];
  }

  const avgStress = memories.reduce((sum, memory) => sum + memory.stressScore, 0) / memories.length;
  const highCrowdCount = memories.filter((memory) => memory.crowdingLevel === "high").length;
  const crowdedRatio = highCrowdCount / memories.length;

  const tips: TransportMicroAlert[] = [
    {
      id: "stress-trend",
      title: "Stress trend",
      detail: `Average stress over ${memories.length} trips: ${avgStress.toFixed(1)} / 10.`,
    },
  ];

  if (crowdedRatio >= 0.4) {
    tips.push({
      id: "optimize-crowding",
      title: "Crowding pattern detected",
      detail: "Choose earlier or later services to reduce crowd-related stress.",
    });
  }

  if (avgStress >= 6) {
    tips.push({
      id: "optimize-calm-route",
      title: "Try a calmer route",
      detail:
        plan.routePreference === "quietest"
          ? "Keep using quietest routing and add a longer transfer buffer."
          : "Switch route preference to quieter services when possible.",
    });
  } else {
    tips.push({
      id: "optimize-maintain",
      title: "Current plan is working",
      detail: "Keep this route and departure window as your preferred baseline.",
    });
  }

  return tips;
}

export function buildTransportSupportCards(
  plan: TransportPlan,
  context: TransportSupportContext
): TransportSupportCard[] {
  const destinationHint = routeEndText(plan, context.direction, context.venueName);

  return [
    {
      id: "first-last-mile",
      title: "Find the right stop and final destination",
      detail: `${fallbackFirstMile(plan)} End at ${destinationHint}.`,
      icon: "navigation",
      priorityRank: 1,
    },
    {
      id: "stop-alert",
      title: "Get ready before your stop",
      detail: stopAlertText(plan),
      icon: "alert",
      priorityRank: 2,
    },
    {
      id: "change-trip",
      title: "Change plan when something unexpected happens",
      detail: disruptionGuidance(plan),
      icon: "refresh",
      priorityRank: 3,
    },
    {
      id: "crowding",
      title: "Check crowding and choose alternatives",
      detail: crowdLevelLabel(plan),
      icon: "crowd",
      priorityRank: 4,
    },
    {
      id: "missed-stop",
      title: "Recover if you miss your stop",
      detail: "Stay on board to the next safe stop, then reroute calmly from there.",
      icon: "help",
      priorityRank: 5,
    },
    {
      id: "trip-prep",
      title: "Use planning and leave-on-time alerts",
      detail: planningReminder(plan),
      icon: "clock",
      priorityRank: 6,
    },
    {
      id: "live-eta",
      title: "Track where your service is now",
      detail: liveEtaText(plan),
      icon: "bus",
      priorityRank: 7,
    },
    {
      id: "panic-help",
      title: "Reach trusted help quickly",
      detail: panicSupportText(context),
      icon: "phone",
      priorityRank: 8,
    },
  ];
}
