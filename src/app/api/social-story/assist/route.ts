import { generateJson } from "@/lib/gemini";
import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

const UNSAFE_TERMS = [
  "porn",
  "nude",
  "explicit",
  "sexual",
  "gore",
  "kill",
  "suicide",
  "hate",
  "racist",
  "abuse",
  "violent",
];

function containsUnsafeText(value: string | undefined) {
  const lower = (value ?? "").toLowerCase();
  return UNSAFE_TERMS.some((term) => lower.includes(term));
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
    title: value.title.trim(),
    text: value.text.trim(),
    sensoryCue: value.sensoryCue?.trim(),
    supportTip: value.supportTip?.trim(),
    speakText: value.speakText?.trim(),
    imagePrompt: value.imagePrompt?.trim(),
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

  if (hasUnsafe) {
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
