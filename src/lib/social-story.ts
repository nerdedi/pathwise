import type {
    ItinerarySection,
    SocialStoryLanguage,
    SocialStoryPanel,
    SocialStoryTranslation,
    SocialStoryTranslationContent,
} from "@/types/itinerary";

export const SOCIAL_STORY_LANGUAGE_OPTIONS = [
  { value: "en", label: "English", shortLabel: "EN", dir: "ltr" },
  { value: "es", label: "Español", shortLabel: "ES", dir: "ltr" },
  { value: "ar", label: "العربية", shortLabel: "AR", dir: "rtl" },
  { value: "zh", label: "中文", shortLabel: "ZH", dir: "ltr" },
] as const;

export const SOCIAL_STORY_STORAGE_PREFIX = "pathwise_social_story_custom_";

const SOCIAL_STORY_VISUALS = [
  {
    matches: ["entrance", "arrive", "arrival", "door", "check in"],
    icon: "🚪",
    label: "Arrival",
    cardClass: "from-sage-100 via-white to-sage-50",
    accentClass: "bg-sage-600 text-white",
  },
  {
    matches: ["walk", "route", "map", "way", "go", "path"],
    icon: "🗺️",
    label: "Wayfinding",
    cardClass: "from-calm-100 via-white to-calm-50",
    accentClass: "bg-calm-600 text-white",
  },
  {
    matches: ["quiet", "calm", "break", "pause", "rest"],
    icon: "🤫",
    label: "Quiet space",
    cardClass: "from-lavender-100 via-white to-lavender-50",
    accentClass: "bg-lavender-600 text-white",
  },
  {
    matches: ["eat", "drink", "cafe", "food", "water"],
    icon: "☕",
    label: "Food and drink",
    cardClass: "from-warm-100 via-white to-warm-50",
    accentClass: "bg-warm-500 text-white",
  },
  {
    matches: ["help", "staff", "desk", "support", "ask"],
    icon: "ℹ️",
    label: "Help point",
    cardClass: "from-sky-100 via-white to-cyan-50",
    accentClass: "bg-sky-600 text-white",
  },
  {
    matches: ["toilet", "bathroom", "restroom"],
    icon: "🚻",
    label: "Toilet",
    cardClass: "from-blue-100 via-white to-blue-50",
    accentClass: "bg-blue-600 text-white",
  },
  {
    matches: ["lift", "stairs", "floor", "up", "down"],
    icon: "🛗",
    label: "Moving through the venue",
    cardClass: "from-violet-100 via-white to-violet-50",
    accentClass: "bg-violet-600 text-white",
  },
  {
    matches: ["exit", "leave", "home", "overwhelmed", "safe"],
    icon: "↗️",
    label: "Exit plan",
    cardClass: "from-rose-100 via-white to-rose-50",
    accentClass: "bg-rose-600 text-white",
  },
] as const;

const TRANSLATABLE_TEXT_FIELDS = ["title", "text", "speakText", "sensoryCue", "supportTip"] as const;
const MAX_SOCIAL_STORY_PANELS = 60;
const MAX_UPLOAD_IMAGE_BYTES = 5 * 1024 * 1024;

export const UNSAFE_TERMS = [
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
  "blood",
  "nsfw",
  "slur",
  "molest",
  "terror",
];

export const COPYRIGHT_RISK_TERMS = [
  "copyright",
  "disney",
  "pixar",
  "marvel",
  "dc comics",
  "pokemon",
  "star wars",
  "hello kitty",
  "nike",
  "apple logo",
  "brand logo",
  "trademark",
  "™",
  "®",
];

function cleanText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function textLooksUnsafe(value: string | undefined) {
  const normalized = (value ?? "").toLowerCase();
  return UNSAFE_TERMS.some((term) => normalized.includes(term));
}

function textHasCopyrightRisk(value: string | undefined) {
  const normalized = (value ?? "").toLowerCase();
  return COPYRIGHT_RISK_TERMS.some((term) => normalized.includes(term));
}

function cleanKeywords(keywords: string[] | undefined) {
  return (keywords ?? [])
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword, index, all) => all.indexOf(keyword) === index)
    .slice(0, 6);
}

function buildOpenSourceImageUrl(panel: SocialStoryPanel, index: number) {
  const seedSource = [
    panel.title,
    panel.text,
    panel.imagePrompt,
    ...(panel.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();

  const fallbackSeed = `pathwise-step-${index + 1}`;
  const seed = encodeURIComponent(seedSource || fallbackSeed);

  return `https://picsum.photos/seed/${seed}/960/540`;
}

export function isAllowedSocialStoryImageUrl(url: string | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image/png;base64,") || url.startsWith("data:image/jpeg;base64,") || url.startsWith("data:image/webp;base64,")) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname === "picsum.photos";
  } catch {
    return false;
  }
}

export function validateSocialStoryImageDataUrl(dataUrl: string) {
  const isAllowedMime =
    dataUrl.startsWith("data:image/png;base64,") ||
    dataUrl.startsWith("data:image/jpeg;base64,") ||
    dataUrl.startsWith("data:image/webp;base64,");

  if (!isAllowedMime) {
    return {
      ok: false,
      reason: "Only PNG, JPEG, and WebP images are allowed.",
    } as const;
  }

  const base64Part = dataUrl.split(",")[1] ?? "";
  const estimatedBytes = Math.floor((base64Part.length * 3) / 4);
  if (estimatedBytes > MAX_UPLOAD_IMAGE_BYTES) {
    return {
      ok: false,
      reason: "Image is too large. Keep uploads under 5MB.",
    } as const;
  }

  return { ok: true } as const;
}

function sanitizePanelImageUrl(panel: SocialStoryPanel, index: number) {
  if (
    typeof panel.imageUrl === "string" &&
    panel.imageUrl.startsWith("data:image/")
  ) {
    const validation = validateSocialStoryImageDataUrl(panel.imageUrl);
    if (validation.ok) {
      return cleanText(panel.imageUrl);
    }
    return buildOpenSourceImageUrl(panel, index);
  }

  if (isAllowedSocialStoryImageUrl(panel.imageUrl)) {
    return cleanText(panel.imageUrl);
  }
  return buildOpenSourceImageUrl(panel, index);
}

function cleanTranslation(
  translation: SocialStoryTranslationContent | undefined
): SocialStoryTranslationContent | undefined {
  if (!translation) return undefined;

  const cleaned: SocialStoryTranslationContent = {
    title: cleanText(translation.title) ?? "",
    text: cleanText(translation.text) ?? "",
  };

  for (const field of TRANSLATABLE_TEXT_FIELDS.slice(2)) {
    const value = cleanText(translation[field]);
    if (value) {
      cleaned[field] = value;
    }
  }

  const keywords = cleanKeywords(translation.keywords);
  if (keywords.length > 0) {
    cleaned.keywords = keywords;
  }

  if (!cleaned.title && !cleaned.text && !cleaned.speakText && !cleaned.sensoryCue && !cleaned.supportTip && !cleaned.keywords?.length) {
    return undefined;
  }

  cleaned.title ||= "Untitled step";
  cleaned.text ||= "";

  return cleaned;
}

function cleanTranslations(translations: SocialStoryTranslation | undefined) {
  if (!translations) return undefined;

  const cleanedEntries = Object.entries(translations)
    .map(([language, translation]) => [language, cleanTranslation(translation)] as const)
    .filter((entry): entry is [SocialStoryLanguage, SocialStoryTranslationContent] => Boolean(entry[1]));

  if (cleanedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(cleanedEntries) as SocialStoryTranslation;
}

export function normalizeSocialStoryPanels(panels: SocialStoryPanel[]) {
  return panels.slice(0, MAX_SOCIAL_STORY_PANELS).map((panel, index) => ({
    ...panel,
    sequence: index + 1,
    title: cleanText(panel.title) ?? `Step ${index + 1}`,
    text: cleanText(panel.text) ?? "",
    imagePrompt: cleanText(panel.imagePrompt),
    imageUrl: sanitizePanelImageUrl(panel, index),
    sensoryCue: cleanText(panel.sensoryCue),
    supportTip: cleanText(panel.supportTip),
    speakText: cleanText(panel.speakText),
    keywords: cleanKeywords(panel.keywords),
    translations: cleanTranslations(panel.translations),
  }));
}

export function createSocialStoryPanel(seedIndex: number): SocialStoryPanel {
  return normalizeSocialStoryPanels([
    {
      sequence: seedIndex + 1,
      title: `New step ${seedIndex + 1}`,
      text: "Describe what happens in this step using calm, simple language.",
      speakText: "This is my next step.",
      imagePrompt: "Calm, inclusive visual for this story step",
      emotion: "calm",
      supportTip: "I can take this step slowly.",
      keywords: ["step", "calm"],
    },
  ])[0];
}

export function addSocialStoryPanel(
  panels: SocialStoryPanel[],
  panel?: Partial<SocialStoryPanel>
) {
  const next = [...panels];
  if (next.length >= MAX_SOCIAL_STORY_PANELS) {
    return normalizeSocialStoryPanels(next);
  }

  next.push({
    ...createSocialStoryPanel(next.length),
    ...panel,
  });

  return normalizeSocialStoryPanels(next);
}

export function duplicateSocialStoryPanel(panels: SocialStoryPanel[], index: number) {
  const next = [...panels];
  const target = next[index];
  if (!target || next.length >= MAX_SOCIAL_STORY_PANELS) {
    return normalizeSocialStoryPanels(next);
  }

  next.splice(index + 1, 0, {
    ...target,
    title: `${target.title} (copy)`,
  });

  return normalizeSocialStoryPanels(next);
}

export function removeSocialStoryPanel(panels: SocialStoryPanel[], index: number) {
  if (panels.length <= 1) {
    return normalizeSocialStoryPanels(panels);
  }

  const next = [...panels];
  next.splice(index, 1);
  return normalizeSocialStoryPanels(next);
}

export function validateSocialStorySafety(panels: SocialStoryPanel[]) {
  const issues: string[] = [];

  panels.forEach((panel, index) => {
    const fields = [panel.title, panel.text, panel.speakText, panel.sensoryCue, panel.supportTip];
    if (fields.some((value) => textLooksUnsafe(value))) {
      issues.push(`Step ${index + 1}: contains potentially unsafe language.`);
    }

    const copyrightFields = [panel.title, panel.text, panel.imagePrompt, panel.speakText];
    if (copyrightFields.some((value) => textHasCopyrightRisk(value))) {
      issues.push(`Step ${index + 1}: contains copyright/trademark-risk language.`);
    }

    if (panel.imageUrl && !isAllowedSocialStoryImageUrl(panel.imageUrl)) {
      issues.push(`Step ${index + 1}: image source is not allowed.`);
    }
  });

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function sanitizeSocialStoryPanelsForStorage(panels: SocialStoryPanel[]) {
  const imageSourceIssues = panels.flatMap((panel, index) => {
    const rawImageUrl = cleanText(panel.imageUrl);
    if (!rawImageUrl) return [];

    if (rawImageUrl.startsWith("data:image/")) {
      const validation = validateSocialStoryImageDataUrl(rawImageUrl);
      if (!validation.ok) {
        return [`Step ${index + 1}: ${validation.reason}`];
      }
      return [];
    }

    if (!isAllowedSocialStoryImageUrl(rawImageUrl)) {
      return [`Step ${index + 1}: image source is not allowed.`];
    }

    return [];
  });

  const normalized = normalizeSocialStoryPanels(panels);
  const safety = validateSocialStorySafety(normalized);

  const sanitized = normalized.map((panel) => {
    const fallbackTitle = panel.title || "Calm step";
    const fallbackText = panel.text || "I can take this step at my own pace.";

    const title = textLooksUnsafe(panel.title) || textHasCopyrightRisk(panel.title)
      ? "Calm step"
      : fallbackTitle;
    const text = textLooksUnsafe(panel.text) || textHasCopyrightRisk(panel.text)
      ? "I can take this step at my own pace."
      : fallbackText;
    const speakText = textLooksUnsafe(panel.speakText) || textHasCopyrightRisk(panel.speakText)
      ? `${title}. ${text}`
      : panel.speakText;
    const imagePrompt = textLooksUnsafe(panel.imagePrompt) || textHasCopyrightRisk(panel.imagePrompt)
      ? "Simple calm illustration with no branded characters or logos"
      : panel.imagePrompt;

    return {
      ...panel,
      title,
      text,
      speakText,
      imagePrompt,
    };
  });

  return {
    panels: normalizeSocialStoryPanels(sanitized),
    safety,
    imageSourceIssues,
  };
}

export function getSocialStoryPanelContent(
  panel: SocialStoryPanel,
  language: SocialStoryLanguage
) {
  const translation = language === "en" ? undefined : panel.translations?.[language];

  return {
    title: translation?.title || panel.title,
    text: translation?.text || panel.text,
    speakText: translation?.speakText || panel.speakText || `${translation?.title || panel.title}. ${translation?.text || panel.text}`,
    sensoryCue: translation?.sensoryCue || panel.sensoryCue,
    supportTip: translation?.supportTip || panel.supportTip,
    keywords: translation?.keywords?.length ? translation.keywords : (panel.keywords ?? []),
    hasTranslation: language === "en" || Boolean(translation?.title || translation?.text || translation?.speakText),
  };
}

export function getSocialStoryVisual(panel: SocialStoryPanel, language: SocialStoryLanguage) {
  const content = getSocialStoryPanelContent(panel, language);
  const haystack = [
    content.title,
    content.text,
    panel.imagePrompt,
    ...(content.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const visual =
    SOCIAL_STORY_VISUALS.find((candidate) =>
      candidate.matches.some((match) => haystack.includes(match))
    ) ?? SOCIAL_STORY_VISUALS[1];

  return visual;
}

export function moveSocialStoryPanel(
  panels: SocialStoryPanel[],
  index: number,
  direction: -1 | 1
) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= panels.length) {
    return normalizeSocialStoryPanels(panels);
  }

  const next = [...panels];
  const [panel] = next.splice(index, 1);
  next.splice(targetIndex, 0, panel);
  return normalizeSocialStoryPanels(next);
}

export function updateSocialStoryPanelContent(
  panels: SocialStoryPanel[],
  index: number,
  language: SocialStoryLanguage,
  patch: Partial<SocialStoryTranslationContent>
) {
  return normalizeSocialStoryPanels(
    panels.map((panel, panelIndex) => {
      if (panelIndex !== index) {
        return panel;
      }

      if (language === "en") {
        return {
          ...panel,
          title: patch.title ?? panel.title,
          text: patch.text ?? panel.text,
          speakText: patch.speakText ?? panel.speakText,
          sensoryCue: patch.sensoryCue ?? panel.sensoryCue,
          supportTip: patch.supportTip ?? panel.supportTip,
          keywords: patch.keywords ?? panel.keywords,
        };
      }

      const currentTranslation = panel.translations?.[language];
      const nextTranslation = cleanTranslation({
        title: patch.title ?? currentTranslation?.title ?? panel.title,
        text: patch.text ?? currentTranslation?.text ?? panel.text,
        speakText: patch.speakText ?? currentTranslation?.speakText,
        sensoryCue: patch.sensoryCue ?? currentTranslation?.sensoryCue,
        supportTip: patch.supportTip ?? currentTranslation?.supportTip,
        keywords: patch.keywords ?? currentTranslation?.keywords,
      });

      const nextTranslations = {
        ...(panel.translations ?? {}),
        ...(nextTranslation ? { [language]: nextTranslation } : {}),
      } satisfies SocialStoryTranslation;

      return {
        ...panel,
        translations: cleanTranslations(nextTranslations),
      };
    })
  );
}

export function parseStoredSocialStory(value: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as SocialStoryPanel[];
    if (!Array.isArray(parsed)) {
      return null;
    }
    return normalizeSocialStoryPanels(parsed);
  } catch {
    return null;
  }
}

export function buildFallbackSocialStoryPanels({
  venueName,
  sections,
  quietTimes,
  selfCareReminders,
}: {
  venueName: string;
  sections: ItinerarySection[];
  quietTimes?: string;
  selfCareReminders?: string[];
}): SocialStoryPanel[] {
  const topSections = sections.slice(0, 6);

  const sectionPanels = topSections.map((section, index) => {
    const firstDetail = section.details?.[0];
    const supportTip = firstDetail ?? "I can take a pause and check my next step.";

    return {
      sequence: index + 2,
      title: section.title,
      text: section.content || "I can follow this step slowly and ask for help if I need it.",
      imagePrompt: `Calm, inclusive illustration of ${section.title.toLowerCase()} at ${venueName}`,
      emotion: "calm" as const,
      sensoryCue: section.id === "if-overwhelmed" ? "It is okay to pause when things feel intense." : undefined,
      supportTip,
      speakText: `${section.title}. ${section.content || "I can go at my own pace."}`,
      keywords: [section.title, section.emoji, "step"].filter(Boolean),
    };
  });

  const reminder = selfCareReminders?.[0] ?? "I can breathe slowly and choose one small next step.";

  return normalizeSocialStoryPanels([
    {
      sequence: 1,
      title: `Getting ready for ${venueName}`,
      text: "I can get ready at my own pace. I can use this story to know what to expect.",
      imagePrompt: `Warm and calm preparation scene for visiting ${venueName}`,
      emotion: "curious",
      sensoryCue: quietTimes ? `A calmer time can be: ${quietTimes}.` : undefined,
      supportTip: "I can pack comfort items before I leave.",
      speakText: `I am getting ready for ${venueName}. I can take this one step at a time.`,
      keywords: ["ready", "calm", "plan"],
    },
    ...sectionPanels,
    {
      sequence: sectionPanels.length + 2,
      title: "If I feel overwhelmed",
      text: "I can pause, move to a quieter place, and ask for support. I am allowed to take breaks.",
      imagePrompt: "Gentle visual of a person taking a calm break in a quiet area",
      emotion: "uncertain",
      sensoryCue: "Strong noise, light, or crowds can feel hard. That is okay.",
      supportTip: reminder,
      speakText: "If I feel overwhelmed, I can pause, breathe, and use my support plan.",
      keywords: ["pause", "quiet", "support"],
    },
    {
      sequence: sectionPanels.length + 3,
      title: "I did something brave",
      text: "I can feel proud of preparing for this visit. Every small step counts.",
      imagePrompt: "Positive, inclusive celebration moment after completing a visit",
      emotion: "proud",
      supportTip: "I can reflect on what helped and save it for next time.",
      speakText: "I did something brave today. Every small step counts.",
      keywords: ["proud", "finished", "next time"],
    },
  ]);
}
