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
