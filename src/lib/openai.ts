import OpenAI from "openai";

// Uses Google Gemini via its OpenAI-compatible endpoint — completely free tier.
// Get a free API key at: https://aistudio.google.com/apikey
let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not set — get a free key at https://aistudio.google.com/apikey");
    }
    _client = new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _client;
}

// Default model to use — gemini-2.0-flash is free and fast
export const AI_MODEL = "gemini-2.0-flash";
