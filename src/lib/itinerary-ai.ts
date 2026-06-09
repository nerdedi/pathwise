import { z } from "zod";

export const PACKING_CATEGORIES = [
  "sensory",
  "comfort",
  "medical",
  "practical",
  "food",
] as const;

export function normalizePackingCategory(category: string | undefined) {
  if (!category) return "practical" as const;
  const lower = category.toLowerCase().trim();
  if (PACKING_CATEGORIES.includes(lower as (typeof PACKING_CATEGORIES)[number])) {
    return lower as (typeof PACKING_CATEGORIES)[number];
  }

  if (lower.includes("sens")) return "sensory" as const;
  if (lower.includes("comfort") || lower.includes("clothing")) return "comfort" as const;
  if (lower.includes("med")) return "medical" as const;
  if (lower.includes("food") || lower.includes("drink") || lower.includes("snack")) {
    return "food" as const;
  }

  return "practical" as const;
}

export function normalizePriority(priority: string | undefined) {
  const lower = (priority ?? "").toLowerCase().trim();
  if (lower === "essential" || lower === "recommended" || lower === "optional") {
    return lower as "essential" | "recommended" | "optional";
  }
  return "recommended" as const;
}

export const AiSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  emoji: z.string().default("📍"),
  content: z.string().default(""),
  details: z.array(z.string()).default([]),
  isExpandable: z.boolean().default(true),
});

export const AiItinerarySchema = z.object({
  sections: z.array(AiSectionSchema).default([]),
  packingList: z
    .array(
      z.object({
        item: z.string().min(1),
        reason: z.string().default(""),
        priority: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .default([])
    .transform((items) =>
      items.map((item) => ({
        ...item,
        priority: normalizePriority(item.priority),
        category: normalizePackingCategory(item.category),
      }))
    ),
  crisisPlan: z
    .object({
      steps: z.array(z.string()).default([]),
      quietRooms: z.array(z.string()).default([]),
      exits: z.array(z.string()).default([]),
      helpDeskLocation: z.string().default("Ask at venue reception"),
      venuePhone: z.string().default(""),
      selfCareReminders: z.array(z.string()).default([]),
    })
    .default({
      steps: [],
      quietRooms: [],
      exits: [],
      helpDeskLocation: "Ask at venue reception",
      venuePhone: "",
      selfCareReminders: [],
    }),
  affirmations: z
    .array(
      z.object({
        text: z.string().min(1),
        timing: z.enum(["before", "during", "overwhelmed", "after"]).catch("during"),
      })
    )
    .default([]),
  socialStory: z
    .array(
      z.object({
        sequence: z.coerce.number().int().positive().catch(1),
        title: z.string().default("Next step"),
        text: z.string().default(""),
        imagePrompt: z.string().optional(),
        emotion: z.enum(["calm", "curious", "happy", "uncertain", "proud"]).catch("calm").optional(),
      })
    )
    .default([]),
  riskScore: z.coerce.number().min(1).max(10).catch(5),
  riskSummary: z.string().default("General preparedness recommended."),
  riskDetails: z
    .record(
      z.object({
        score: z.coerce.number().min(1).max(10).catch(5),
        detail: z.string().default(""),
      })
    )
    .default({}),
});
