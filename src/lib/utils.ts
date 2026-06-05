import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function minutesToDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function riskScoreLabel(score: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (score <= 3)
    return { label: "Calm", color: "text-sage-700", bg: "bg-sage-100" };
  if (score <= 6)
    return {
      label: "Moderate",
      color: "text-warm-700",
      bg: "bg-warm-100",
    };
  return { label: "Stimulating", color: "text-red-700", bg: "bg-red-100" };
}

export function sensoryLevelColor(level: "low" | "medium" | "high"): string {
  return {
    low: "sensory-low",
    medium: "sensory-medium",
    high: "sensory-high",
  }[level];
}
