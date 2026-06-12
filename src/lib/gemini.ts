import { parseTimeoutFromEnv, withTimeout } from "@/lib/timeout";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Provider selection: Groq (free, fast) → Gemini (free, slower)
// Set GROQ_API_KEY in .env.local for instant free inference.
// Get a key at https://console.groq.com (no credit card required).
// ---------------------------------------------------------------------------

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.0-flash";
const AI_REQUEST_TIMEOUT_MS = parseTimeoutFromEnv("AI_REQUEST_TIMEOUT_MS", 30_000);

async function generateJsonGroq(
  systemPrompt: string,
  userMessage: string
): Promise<unknown> {
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}

async function generateJsonGemini(
  systemPrompt: string,
  userMessage: string
): Promise<unknown> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No AI API key found. Set GROQ_API_KEY (free at https://console.groq.com) " +
        "or GOOGLE_AI_API_KEY (free at https://aistudio.google.com/apikey)."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  return JSON.parse(text);
}

/**
 * Generate a JSON response from the best available free AI provider.
 * Priority: Groq (if GROQ_API_KEY set) → Gemini (GOOGLE_AI_API_KEY)
 */
export async function generateJson(
  systemPrompt: string,
  userMessage: string
): Promise<unknown> {
  const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GOOGLE_AI_API_KEY?.trim());

  let primaryError: unknown;

  if (hasGroq) {
    try {
      return await withTimeout(
        "Groq generation",
        AI_REQUEST_TIMEOUT_MS,
        generateJsonGroq(systemPrompt, userMessage)
      );
    } catch (error) {
      primaryError = error;
      if (!hasGemini) throw error;
    }
  }

  if (hasGemini) {
    try {
      return await withTimeout(
        "Gemini generation",
        AI_REQUEST_TIMEOUT_MS,
        generateJsonGemini(systemPrompt, userMessage)
      );
    } catch (error) {
      if (primaryError) {
        throw new Error(
          `AI generation failed on both providers: ${(primaryError as Error).message}; ${(error as Error).message}`
        );
      }
      throw error;
    }
  }

  throw new Error(
    "No AI API key found. Set GROQ_API_KEY (free at https://console.groq.com) " +
      "or GOOGLE_AI_API_KEY (free at https://aistudio.google.com/apikey)."
  );
}
