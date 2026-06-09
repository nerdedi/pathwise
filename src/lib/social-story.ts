import type {
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

const TRANSLATABLE_TEXT_FIELDS = ["title", "text", "speakText", "sensoryCue", "supportTip"] as const;

function cleanText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanKeywords(keywords: string[] | undefined) {
  return (keywords ?? [])
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword, index, all) => all.indexOf(keyword) === index)
    .slice(0, 6);
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
  return panels.map((panel, index) => ({
    ...panel,
    sequence: index + 1,
    title: cleanText(panel.title) ?? `Step ${index + 1}`,
    text: cleanText(panel.text) ?? "",
    imagePrompt: cleanText(panel.imagePrompt),
    imageUrl: cleanText(panel.imageUrl),
    sensoryCue: cleanText(panel.sensoryCue),
    supportTip: cleanText(panel.supportTip),
    speakText: cleanText(panel.speakText),
    keywords: cleanKeywords(panel.keywords),
    translations: cleanTranslations(panel.translations),
  }));
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
