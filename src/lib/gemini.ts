import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Provider selection: Groq (free, fast) → Gemini (free, slower)
// Set GROQ_API_KEY in .env.local for instant free inference.
// Get a key at https://console.groq.com (no credit card required).
// ---------------------------------------------------------------------------

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.0-flash";

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
  if (process.env.GROQ_API_KEY) {
    return generateJsonGroq(systemPrompt, userMessage);
  }
  return generateJsonGemini(systemPrompt, userMessage);
}
