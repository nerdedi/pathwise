import type { SocialStoryLanguage } from "@/types/itinerary";

type SpeakOptions = {
  lang?: string;
  voices?: SpeechSynthesisVoice[];
  selectedVoiceName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
};

const VOICE_NAME_PREFERENCES: Record<string, string[]> = {
  en: [
    "aria",
    "libby",
    "samantha",
    "serena",
    "google uk english female",
    "google us english",
    "microsoft",
    "female",
    "neural",
    "natural",
  ],
  es: ["elvira", "monica", "microsoft", "female", "neural", "natural"],
  ar: ["hoda", "microsoft", "female", "neural", "natural"],
  zh: ["xiaoxiao", "tingting", "microsoft", "female", "neural", "natural"],
};

function voiceLangMatches(voice: SpeechSynthesisVoice, lang: string) {
  const base = lang.split("-")[0]?.toLowerCase();
  return voice.lang.toLowerCase().startsWith(base);
}

function voiceScore(voice: SpeechSynthesisVoice, lang: string) {
  const voiceName = voice.name.toLowerCase();
  const base = lang.split("-")[0]?.toLowerCase() || "en";
  const preferredNames = VOICE_NAME_PREFERENCES[base] ?? VOICE_NAME_PREFERENCES.en;

  let score = 0;
  if (voiceLangMatches(voice, lang)) score += 60;
  if (voice.default) score += 10;

  preferredNames.forEach((fragment, index) => {
    if (voiceName.includes(fragment)) {
      score += Math.max(16 - index, 4);
    }
  });

  if (voiceName.includes("male")) score -= 2;
  if (voiceName.includes("compact") || voiceName.includes("espeak")) score -= 10;

  return score;
}

export function mapStoryLanguageToSpeechLang(language: SocialStoryLanguage | string) {
  if (language === "es") return "es-ES";
  if (language === "ar") return "ar-SA";
  if (language === "zh") return "zh-CN";
  return "en-AU";
}

export function pickPreferredSpeechVoice(
  voices: SpeechSynthesisVoice[],
  options: Pick<SpeakOptions, "lang" | "selectedVoiceName">
) {
  const lang = options.lang ?? "en-AU";
  const selectedVoice = options.selectedVoiceName
    ? voices.find((voice) => voice.name === options.selectedVoiceName)
    : undefined;

  if (selectedVoice && voiceLangMatches(selectedVoice, lang)) {
    return selectedVoice;
  }

  return [...voices]
    .sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0];
}

export function applyCalmingSpeechPreferences(
  utterance: SpeechSynthesisUtterance,
  options: SpeakOptions = {}
) {
  const lang = options.lang ?? "en-AU";
  const voices = options.voices ?? [];
  const preferredVoice = pickPreferredSpeechVoice(voices, {
    lang,
    selectedVoiceName: options.selectedVoiceName,
  });

  utterance.lang = preferredVoice?.lang ?? lang;
  utterance.rate = options.rate ?? 0.9;
  utterance.pitch = options.pitch ?? 0.92;
  utterance.volume = options.volume ?? 1;

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  return utterance;
}

export function speakCalmText(text: string, options: SpeakOptions = {}) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !text.trim()
  ) {
    return false;
  }

  const utterance = applyCalmingSpeechPreferences(
    new SpeechSynthesisUtterance(text),
    {
      ...options,
      voices: options.voices ?? window.speechSynthesis.getVoices(),
    }
  );

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}