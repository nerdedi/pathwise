import { logWarn } from "@/lib/logger";

type ModerationTrigger = "unsafe" | "copyright" | "rate-limit" | "image-source";

interface ModerationEvent {
  route: string;
  trigger: ModerationTrigger;
  panelCount?: number;
  issuesCount?: number;
}

export function recordModerationEvent(event: ModerationEvent) {
  logWarn(event.route, `moderation:${event.trigger}`, {
    panelCount: event.panelCount,
    issuesCount: event.issuesCount,
    ts: new Date().toISOString(),
  });
}
