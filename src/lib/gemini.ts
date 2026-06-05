import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_AI_API_KEY is not set — get a free key at https://aistudio.google.com/apikey"
      );
    }
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

export const AI_MODEL = "gemini-2.0-flash";

/**
 * Generate a JSON response from Gemini given a system prompt and user message.
 * Returns the parsed JSON object.
 */
export async function generateJson(
  systemPrompt: string,
  userMessage: string
): Promise<unknown> {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({
    model: AI_MODEL,
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
