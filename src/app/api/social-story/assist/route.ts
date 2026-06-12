import { generateJson } from "@/lib/gemini";
import { logError } from "@/lib/logger";
import { COPYRIGHT_RISK_TERMS, UNSAFE_TERMS } from "@/lib/social-story";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const assistRateLimitStore = new Map<string, number[]>();

const AssistSchema = z.object({
  venueName: z.string().min(1),
  quietTimes: z.string().optional(),
  panel: z.object({
    title: z.string().min(1),
    text: z.string().min(1),
    sensoryCue: z.string().optional(),
    supportTip: z.string().optional(),
    speakText: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    imagePrompt: z.string().optional(),
  }),
  goal: z.enum(["simplify", "expand", "calm"]).default("calm"),
  audience: z.enum(["child", "teen", "adult", "mixed"]).default("mixed"),
});

function containsUnsafeText(value: string | undefined) {
  const lower = (value ?? "").toLowerCase();
  return UNSAFE_TERMS.some((term) => lower.includes(term));
}

function containsCopyrightRiskText(value: string | undefined) {
  const lower = (value ?? "").toLowerCase();
  return COPYRIGHT_RISK_TERMS.some((term) => lower.includes(term));
}

function clampText(value: string | undefined, maxLength: number) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function getClientId(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "unknown-client";
}

function isRateLimited(clientId: string) {
  const now = Date.now();
  const previous = assistRateLimitStore.get(clientId) ?? [];
  const withinWindow = previous.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (withinWindow.length >= RATE_LIMIT_MAX_REQUESTS) {
    assistRateLimitStore.set(clientId, withinWindow);
    return true;
  }

  withinWindow.push(now);
  assistRateLimitStore.set(clientId, withinWindow);
  return false;
}

function sanitizeOutput(value: {
  title: string;
  text: string;
  sensoryCue?: string;
  supportTip?: string;
  speakText?: string;
  keywords?: string[];
  imagePrompt?: string;
}) {
  const sanitized = {
    ...value,
    title: clampText(value.title, 120),
    text: clampText(value.text, 320),
    sensoryCue: clampText(value.sensoryCue, 180),
    supportTip: clampText(value.supportTip, 180),
    speakText: clampText(value.speakText, 240),
    imagePrompt: clampText(value.imagePrompt, 220),
    keywords: (value.keywords ?? []).map((keyword) => keyword.trim()).filter(Boolean).slice(0, 6),
  };

  const hasUnsafe = [
    sanitized.title,
    sanitized.text,
    sanitized.sensoryCue,
    sanitized.supportTip,
    sanitized.speakText,
    sanitized.imagePrompt,
  ].some((field) => containsUnsafeText(field));

  const hasCopyrightRisk = [
    sanitized.title,
    sanitized.text,
    sanitized.sensoryCue,
    sanitized.supportTip,
    sanitized.speakText,
    sanitized.imagePrompt,
  ].some((field) => containsCopyrightRiskText(field));

  if (hasUnsafe || hasCopyrightRisk) {
    return {
      title: "Calm next step",
      text: "Let’s use a simple, safe step for this part of the story.",
      sensoryCue: "Notice your surroundings and move at your pace.",
      supportTip: "Take a breath and choose one small next action.",
      speakText: "Let’s use a calm and safe next step.",
      keywords: ["calm", "safe", "step"],
      imagePrompt: "Simple calm illustration of a person taking one gentle next step",
    };
  }

  return sanitized;
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    if (isRateLimited(clientId)) {
      return NextResponse.json(
        { error: "Too many AI assist requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = AssistSchema.parse(await req.json());

    const systemPrompt = `
You are a neuroaffirming social story assistant.
Return ONLY JSON with these keys:
- title: string
- text: string
- sensoryCue?: string
- supportTip?: string
- speakText?: string
- keywords?: string[]
- imagePrompt?: string

Rules:
- Use plain, supportive language suitable for ${body.audience} audience.
- Avoid fear-based wording.
- Keep text practical and brief.
- No harmful, sexual, violent, hateful, or copyrighted brand/logo references.
- Keep it usable for all ages and abilities.
`.trim();

    const userPrompt = `
Venue: ${body.venueName}
Calmer times: ${body.quietTimes ?? "Not specified"}
Goal: ${body.goal}
Current panel:
${JSON.stringify(body.panel, null, 2)}

Improve this panel while preserving intent. Return JSON only.
`.trim();

    const response = (await generateJson(systemPrompt, userPrompt)) as Record<string, unknown>;

    const suggested = sanitizeOutput({
      title: String(response.title ?? body.panel.title),
      text: String(response.text ?? body.panel.text),
      sensoryCue: typeof response.sensoryCue === "string" ? response.sensoryCue : body.panel.sensoryCue,
      supportTip: typeof response.supportTip === "string" ? response.supportTip : body.panel.supportTip,
      speakText: typeof response.speakText === "string" ? response.speakText : body.panel.speakText,
      imagePrompt: typeof response.imagePrompt === "string" ? response.imagePrompt : body.panel.imagePrompt,
      keywords: Array.isArray(response.keywords)
        ? response.keywords.map((value) => String(value))
        : body.panel.keywords,
    });

    return NextResponse.json({ panel: suggested });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    logError("/api/social-story/assist", err);
    return NextResponse.json(
      { error: "Failed to generate social story suggestion." },
      { status: 500 }
    );
  }
}

export function __resetAssistRateLimitForTests() {
  assistRateLimitStore.clear();
}
