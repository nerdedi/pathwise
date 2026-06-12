"use client";

import { Button } from "@/components/ui/button";
import {
    addSocialStoryPanel,
    createSocialStoryPanel,
    duplicateSocialStoryPanel,
    getSocialStoryPanelContent,
    getSocialStoryVisual,
    isAllowedSocialStoryImageUrl,
    moveSocialStoryPanel,
    normalizeSocialStoryPanels,
    parseStoredSocialStory,
    removeSocialStoryPanel,
    SOCIAL_STORY_LANGUAGE_OPTIONS,
    SOCIAL_STORY_STORAGE_PREFIX,
    updateSocialStoryPanelContent,
    validateSocialStoryImageDataUrl,
    validateSocialStorySafety,
} from "@/lib/social-story";
import {
    applyCalmingSpeechPreferences,
    mapStoryLanguageToSpeechLang,
    pickPreferredSpeechVoice,
} from "@/lib/voice";
import type { SocialStoryPanel } from "@/types/itinerary";
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    Copy,
    Heart,
    Languages,
    PauseCircle,
    Pencil,
    PlayCircle,
    Plus,
    Printer,
    RotateCcw,
    Save,
    Sparkles,
    Trash2,
    Volume2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

interface SocialStoryViewerProps {
  panels: SocialStoryPanel[];
  venueName: string;
  itineraryId: string;
  quietTimes?: string;
  supportReminders?: string[];
}

const EMOTION_COLORS: Record<NonNullable<SocialStoryPanel["emotion"]>, string> = {
  calm: "bg-sage-50 border-sage-200",
  curious: "bg-calm-50 border-calm-200",
  happy: "bg-warm-50 border-warm-200",
  uncertain: "bg-lavender-50 border-lavender-200",
  proud: "bg-pink-50 border-pink-200",
};

const EMOTION_EMOJIS: Record<NonNullable<SocialStoryPanel["emotion"]>, string> = {
  calm: "😌",
  curious: "🤔",
  happy: "😊",
  uncertain: "😐",
  proud: "🌟",
};

export default function SocialStoryViewer({
  panels,
  venueName,
  itineraryId,
  quietTimes,
  supportReminders = [],
}: SocialStoryViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const focusModePanelRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });
  const [focusMode, setFocusMode] = useState(false);
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const [textSize, setTextSize] = useState<"standard" | "large" | "xl">("large");
  const [speechRate, setSpeechRate] = useState(0.95);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [isReadingAll, setIsReadingAll] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "es" | "ar" | "zh">("en");
  const [storyPanels, setStoryPanels] = useState<SocialStoryPanel[]>(() => normalizeSocialStoryPanels(panels));
  const [editorMessage, setEditorMessage] = useState("");
  const [newFrameCount, setNewFrameCount] = useState(1);
  const [aiAssistingIndex, setAiAssistingIndex] = useState<number | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});
  const speechLanguage = useMemo(
    () => mapStoryLanguageToSpeechLang(selectedLanguage),
    [selectedLanguage]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      setStoryPanels(normalizeSocialStoryPanels(panels));
      return;
    }

    const key = `${SOCIAL_STORY_STORAGE_PREFIX}${itineraryId}`;
    const stored = parseStoredSocialStory(sessionStorage.getItem(key));
    setStoryPanels(stored ?? normalizeSocialStoryPanels(panels));
  }, [itineraryId, panels]);

  useEffect(() => {
    if (!focusMode) return;
    focusModePanelRef.current?.focus();
  }, [focusMode, activePanelIndex]);

  const activePanel = storyPanels[activePanelIndex] ?? storyPanels[0];
  const textSizeClass =
    textSize === "standard"
      ? "text-base"
      : textSize === "xl"
        ? "text-xl"
        : "text-lg";

  const languageVoices = useMemo(
    () =>
      voices
        .filter((voice, index, arr) => arr.findIndex((item) => item.name === voice.name) === index)
        .filter((voice) =>
          selectedLanguage === "en"
            ? voice.lang.toLowerCase().startsWith("en")
            : voice.lang.toLowerCase().startsWith(selectedLanguage)
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [selectedLanguage, voices]
  );

  const voiceOptions = languageVoices.length > 0 ? languageVoices : voices;

  const availableLanguages = useMemo(() => {
    const available = new Set(["en"]);
    storyPanels.forEach((panel) => {
      const translations = panel.translations;
      if (!translations) return;
      (Object.keys(translations) as Array<"es" | "ar" | "zh">).forEach((code) => {
        const translation = translations[code];
        if (translation?.title || translation?.text) {
          available.add(code);
        }
      });
    });
    return SOCIAL_STORY_LANGUAGE_OPTIONS.filter((option) => available.has(option.value));
  }, [storyPanels]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      const preferredVoice = pickPreferredSpeechVoice(available, {
        lang: speechLanguage,
        selectedVoiceName: selectedVoice,
      });
      if (preferredVoice && preferredVoice.name !== selectedVoice) {
        setSelectedVoice(preferredVoice.name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice, speechLanguage]);

  const speak = (text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
      onEnd?.();
      return;
    }

    const utterance = applyCalmingSpeechPreferences(
      new SpeechSynthesisUtterance(text),
      {
        voices: voiceOptions,
        selectedVoiceName: selectedVoice,
        lang: speechLanguage,
        rate: speechRate,
        pitch: 0.9,
      }
    );
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const speakPanel = (panel: SocialStoryPanel) => {
    const content = getSocialStoryPanelContent(panel, selectedLanguage);
    speak(content.speakText);
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsReadingAll(false);
  };

  const readAllPanels = (startIndex = 0) => {
    if (startIndex >= storyPanels.length) {
      setIsReadingAll(false);
      return;
    }

    setIsReadingAll(true);
    setActivePanelIndex(startIndex);
    const panel = storyPanels[startIndex];
    const content = getSocialStoryPanelContent(panel, selectedLanguage);
    speak(content.speakText, () => {
      readAllPanels(startIndex + 1);
    });
  };

  const goToPanel = (index: number) => {
    const next = Math.max(0, Math.min(index, storyPanels.length - 1));
    setActivePanelIndex(next);
  };

  const saveCustomStory = () => {
    if (typeof window === "undefined") return;

    const safety = validateSocialStorySafety(storyPanels);
    if (!safety.ok) {
      setEditorMessage(`Please review safety checks: ${safety.issues[0]}`);
      return;
    }

    const hasInvalidImage = storyPanels.some(
      (panel) => panel.imageUrl && !isAllowedSocialStoryImageUrl(panel.imageUrl)
    );
    if (hasInvalidImage) {
      setEditorMessage(
        "One or more image sources are not allowed. Use uploaded images or built-in safe image options."
      );
      return;
    }

    const key = `${SOCIAL_STORY_STORAGE_PREFIX}${itineraryId}`;
    sessionStorage.setItem(key, JSON.stringify(storyPanels));
    setEditorMessage("Social story saved for this itinerary.");
  };

  const resetCustomStory = () => {
    const normalized = normalizeSocialStoryPanels(panels);
    setStoryPanels(normalized);
    setActivePanelIndex(0);
    if (typeof window !== "undefined") {
      const key = `${SOCIAL_STORY_STORAGE_PREFIX}${itineraryId}`;
      sessionStorage.removeItem(key);
    }
    setEditorMessage("Story reset to itinerary defaults.");
  };

  const updatePanelField = (
    index: number,
    field: "title" | "text" | "speakText" | "sensoryCue" | "supportTip",
    value: string
  ) => {
    setStoryPanels((current) =>
      updateSocialStoryPanelContent(current, index, selectedLanguage, {
        [field]: value,
      })
    );
  };

  const picsumChoices = useMemo(() => {
    if (!activePanel) return [] as string[];
    const seed = `${activePanel.title}-${activePanel.sequence}`
      .toLowerCase()
      .replace(/\s+/g, "-");

    return [
      `https://picsum.photos/seed/${encodeURIComponent(seed)}-a/960/540`,
      `https://picsum.photos/seed/${encodeURIComponent(seed)}-b/960/540`,
      `https://picsum.photos/seed/${encodeURIComponent(seed)}-c/960/540`,
      `https://picsum.photos/seed/${encodeURIComponent(seed)}-d/960/540`,
    ];
  }, [activePanel]);

  const setPanelImageUrl = (index: number, imageUrl: string) => {
    setStoryPanels((current) =>
      normalizeSocialStoryPanels(
        current.map((panel, panelIndex) =>
          panelIndex === index ? { ...panel, imageUrl } : panel
        )
      )
    );
  };

  const handleImageUpload = async (index: number, file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      const message = "Only PNG, JPEG, or WebP files are allowed.";
      setUploadErrors((current) => ({ ...current, [index]: message }));
      setEditorMessage(message);
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    }).catch(() => "");

    if (!dataUrl) {
      const message = "Could not read image file.";
      setUploadErrors((current) => ({ ...current, [index]: message }));
      setEditorMessage(message);
      return;
    }

    const validation = validateSocialStoryImageDataUrl(dataUrl);
    if (!validation.ok) {
      setUploadErrors((current) => ({ ...current, [index]: validation.reason }));
      setEditorMessage(validation.reason);
      return;
    }

    setUploadErrors((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
    setPanelImageUrl(index, dataUrl);
    setEditorMessage("Image uploaded safely for this frame.");
  };

  const applyAiAssist = async (index: number) => {
    const panel = storyPanels[index];
    if (!panel) return;

    setAiAssistingIndex(index);
    setEditorMessage("");

    try {
      const localized = getSocialStoryPanelContent(panel, selectedLanguage);
      const res = await fetch("/api/social-story/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueName,
          quietTimes,
          goal: "calm",
          audience: "mixed",
          panel: {
            title: localized.title,
            text: localized.text,
            sensoryCue: localized.sensoryCue,
            supportTip: localized.supportTip,
            speakText: localized.speakText,
            keywords: localized.keywords,
            imagePrompt: panel.imagePrompt,
          },
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? "Could not generate AI suggestion");
      }

      setStoryPanels((current) =>
        normalizeSocialStoryPanels(
          current.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            if (selectedLanguage === "en") {
              return {
                ...item,
                title: payload.panel.title ?? item.title,
                text: payload.panel.text ?? item.text,
                sensoryCue: payload.panel.sensoryCue ?? item.sensoryCue,
                supportTip: payload.panel.supportTip ?? item.supportTip,
                speakText: payload.panel.speakText ?? item.speakText,
                imagePrompt: payload.panel.imagePrompt ?? item.imagePrompt,
                keywords: payload.panel.keywords ?? item.keywords,
              };
            }

            return updateSocialStoryPanelContent([item], 0, selectedLanguage, {
              title: payload.panel.title,
              text: payload.panel.text,
              sensoryCue: payload.panel.sensoryCue,
              supportTip: payload.panel.supportTip,
              speakText: payload.panel.speakText,
              keywords: payload.panel.keywords,
            })[0];
          })
        )
      );

      setEditorMessage("AI suggestion applied to this frame.");
    } catch (err) {
      setEditorMessage(err instanceof Error ? err.message : "AI suggestion failed.");
    } finally {
      setAiAssistingIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-lavender-50 to-white">
      {/* Nav */}
      <nav className="bg-white border-b border-lavender-100 px-4 h-14 flex items-center justify-between no-print">
        <Link
          href={`/plan/${itineraryId}`}
          className="flex items-center gap-2 text-sage-700 text-sm hover:text-sage-900 focus-calm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to guide
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePrint()} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" />
            Print social story
          </Button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8 no-print">
          <div className="inline-flex items-center gap-2 bg-lavender-100 text-lavender-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Heart className="w-3.5 h-3.5" />
            Visual Social Story
          </div>
          <h1 className="text-3xl font-bold text-sage-900 mb-2">
            My visit to {venueName}
          </h1>
          <p className="text-sage-600 text-sm">
            Read this before your visit. You can print it out and take it with
            you.
          </p>
        </div>

        {(quietTimes || supportReminders.length > 0) && (
          <div className="rounded-2xl border border-sage-100 bg-sage-50/60 p-4 mb-6 no-print">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-500 mb-2">
              Before you start
            </p>
            {quietTimes && (
              <p className="text-sm text-sage-700">
                <span className="font-semibold">Calmer time to visit:</span> {quietTimes}
              </p>
            )}
            {supportReminders.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {supportReminders.slice(0, 3).map((reminder) => (
                  <li key={reminder} className="flex gap-2 text-sm text-sage-700">
                    <span className="text-sage-400 mt-0.5">•</span>
                    <span>{reminder}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-lavender-100 bg-white p-4 mb-6 no-print">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant={focusMode ? "default" : "outline"} size="sm" onClick={() => setFocusMode((value) => !value)}>
                {focusMode ? "Exit focus mode" : "Focus mode"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => readAllPanels(activePanelIndex)} disabled={storyPanels.length === 0 || isReadingAll} className="gap-1.5">
                <PlayCircle className="w-3.5 h-3.5" />
                Read from here
              </Button>
              <Button variant="outline" size="sm" onClick={stopSpeech} disabled={!isReadingAll} className="gap-1.5">
                <PauseCircle className="w-3.5 h-3.5" />
                Stop audio
              </Button>
              <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={() => setIsEditing((value) => !value)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                {isEditing ? "Done editing" : "Edit story"}
              </Button>
              <Button variant="outline" size="sm" onClick={saveCustomStory} className="gap-1.5" disabled={storyPanels.length === 0}>
                <Save className="w-3.5 h-3.5" />
                Save edits
              </Button>
              <Button variant="outline" size="sm" onClick={resetCustomStory} className="gap-1.5" disabled={storyPanels.length === 0}>
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
              {isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStoryPanels((current) => {
                        let next = current;
                        for (let i = 0; i < Math.max(1, Math.min(newFrameCount, 10)); i += 1) {
                          next = addSocialStoryPanel(next, createSocialStoryPanel(next.length));
                        }
                        return next;
                      });
                      setEditorMessage("New frame(s) added.");
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add frame
                  </Button>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newFrameCount}
                    onChange={(e) => setNewFrameCount(Number(e.target.value) || 1)}
                    className="h-9 w-16 rounded-lg border border-sage-200 bg-white px-2 text-xs text-sage-700"
                    aria-label="Number of frames to add"
                  />
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as typeof selectedLanguage)}
                className="h-9 rounded-lg border border-sage-200 bg-white px-3 text-sage-700"
                aria-label="Story language"
              >
                {availableLanguages.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
              <select
                value={textSize}
                onChange={(e) => setTextSize(e.target.value as typeof textSize)}
                className="h-9 rounded-lg border border-sage-200 bg-white px-3 text-sage-700"
                aria-label="Text size"
              >
                <option value="standard">Standard text</option>
                <option value="large">Large text</option>
                <option value="xl">Extra large text</option>
              </select>
              <select
                value={String(speechRate)}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="h-9 rounded-lg border border-sage-200 bg-white px-3 text-sage-700"
                aria-label="Speech rate"
              >
                <option value="0.85">Slow voice</option>
                <option value="0.95">Gentle pace</option>
                <option value="1">Normal pace</option>
              </select>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="h-9 rounded-lg border border-sage-200 bg-white px-3 text-sage-700 max-w-44"
                aria-label="Voice selection"
              >
                {languageVoices.length === 0 ? (
                  <option value="">Browser default voice</option>
                ) : (
                  languageVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          <p className="text-xs text-sage-500 mt-3">
            Tap any story card to hear it spoken aloud. Focus mode shows one step at a time, like a calmer visual schedule.
          </p>
          <p className="text-xs text-sage-500 mt-1 flex items-center gap-1">
            <Languages className="w-3 h-3" />
            Language toggle shows translated text when available. Editing updates the selected language view.
          </p>
          {editorMessage && (
            <p role="status" aria-live="polite" className="text-xs text-sage-600 mt-2">
              {editorMessage}
            </p>
          )}
        </div>

        {/* Printable story */}
        <div ref={printRef}>
          {storyPanels.length === 0 && (
            <div className="rounded-2xl border border-sage-100 bg-white p-6 text-center">
              <p className="text-sage-700">
                We couldn&rsquo;t load story steps yet. Please return to your guide and regenerate your itinerary.
              </p>
            </div>
          )}

          {/* Print header */}
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-2xl font-bold">My visit to {venueName}</h1>
            <p className="text-sm text-gray-500 mt-1">Made with Pathwise</p>
          </div>

          {storyPanels.length > 0 && focusMode && activePanel ? (
            <div className="space-y-4">
              {(() => {
                const activeContent = getSocialStoryPanelContent(activePanel, selectedLanguage);
                const visual = getSocialStoryVisual(activePanel, selectedLanguage);
                return (
              <div
                ref={focusModePanelRef}
                tabIndex={-1}
                className="rounded-2xl border-2 p-6 bg-white border-lavender-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-sage-500 bg-white rounded-full w-7 h-7 flex items-center justify-center border border-sage-200">
                    {activePanel.sequence}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => speakPanel(activePanel)} className="gap-1.5 no-print">
                    <Volume2 className="w-3.5 h-3.5" />
                    Speak this step
                  </Button>
                </div>

                {activePanel.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activePanel.imageUrl}
                    alt={activeContent.title}
                    className="w-full aspect-video object-cover rounded-xl mb-4 bg-sage-100"
                  />
                ) : (
                  <div className={`w-full aspect-video rounded-xl mb-4 border border-lavender-100 bg-gradient-to-br ${visual.cardClass} flex flex-col items-center justify-center px-6 text-center`}>
                    <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm ${visual.accentClass}`}>
                      {visual.icon}
                    </div>
                    <p className="text-sm font-semibold text-sage-800">{visual.label}</p>
                    <p className="text-xs text-sage-600 mt-2 max-w-xs">
                      {activePanel.imagePrompt ?? "Calm visual cue for this step."}
                    </p>
                  </div>
                )}

                <h3 className="font-bold text-sage-900 text-xl mb-2">{activeContent.title}</h3>
                <p className={`text-sage-800 leading-relaxed ${textSizeClass}`}>{activeContent.text}</p>

                {isEditing && (
                  <div className="mt-4 space-y-3 no-print">
                    <input
                      type="text"
                      value={activeContent.title}
                      onChange={(e) => updatePanelField(activePanelIndex, "title", e.target.value)}
                      className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800"
                      aria-label="Edit panel title"
                    />
                    <textarea
                      value={activeContent.text}
                      onChange={(e) => updatePanelField(activePanelIndex, "text", e.target.value)}
                      className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 min-h-24"
                      aria-label="Edit panel text"
                    />
                    <textarea
                      value={activeContent.speakText}
                      onChange={(e) => updatePanelField(activePanelIndex, "speakText", e.target.value)}
                      className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-700 min-h-16"
                      aria-label="Edit panel spoken text"
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void applyAiAssist(activePanelIndex)}
                        disabled={aiAssistingIndex === activePanelIndex}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {aiAssistingIndex === activePanelIndex ? "AI assisting…" : "AI help this frame"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() =>
                          setStoryPanels((current) =>
                            duplicateSocialStoryPanel(current, activePanelIndex)
                          )
                        }
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate frame
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setStoryPanels((current) =>
                            removeSocialStoryPanel(current, activePanelIndex)
                          );
                          setActivePanelIndex((current) => Math.max(0, current - 1));
                        }}
                        disabled={storyPanels.length <= 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete frame
                      </Button>
                    </div>

                    <label className="text-xs text-sage-600">
                      Upload your own image (PNG/JPEG/WebP, max 5MB)
                      <input
                        id={`social-story-upload-${activePanelIndex}`}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="mt-1 block w-full text-xs"
                        aria-describedby={
                          uploadErrors[activePanelIndex]
                            ? `social-story-upload-error-${activePanelIndex}`
                            : undefined
                        }
                        onChange={(e) => {
                          void handleImageUpload(activePanelIndex, e.target.files?.[0]);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {uploadErrors[activePanelIndex] && (
                      <p
                        id={`social-story-upload-error-${activePanelIndex}`}
                        className="text-xs text-red-600"
                        role="status"
                        aria-live="polite"
                      >
                        {uploadErrors[activePanelIndex]}
                      </p>
                    )}

                    <div>
                      <p className="text-xs text-sage-600 mb-1">Choose a safe built-in image</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {picsumChoices.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setPanelImageUrl(activePanelIndex, url)}
                            className="rounded-lg border border-sage-200 overflow-hidden"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Selectable story visual" className="h-16 w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {(activeContent.sensoryCue || activeContent.supportTip || (activeContent.keywords?.length ?? 0) > 0) && (
                  <div className="mt-4 space-y-3">
                    {activeContent.sensoryCue && (
                      <div className="rounded-xl bg-warm-50 border border-warm-100 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-warm-700 mb-1">Sensory cue</p>
                        <p className="text-sm text-sage-700">{activeContent.sensoryCue}</p>
                      </div>
                    )}
                    {activeContent.supportTip && (
                      <div className="rounded-xl bg-sage-50 border border-sage-100 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-sage-700 mb-1">Support tip</p>
                        <p className="text-sm text-sage-700">{activeContent.supportTip}</p>
                      </div>
                    )}
                    {(activeContent.keywords?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {activeContent.keywords?.map((keyword) => (
                          <span key={`${activePanel.sequence}-${keyword}`} className="rounded-full border border-lavender-200 bg-lavender-50 px-3 py-1 text-xs text-lavender-700">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
                );
              })()}

              <div className="flex items-center justify-between gap-3 no-print">
                <Button variant="outline" onClick={() => goToPanel(activePanelIndex - 1)} disabled={activePanelIndex === 0} className="gap-1.5">
                  <ChevronLeft className="w-4 h-4" />
                  Previous step
                </Button>
                <p className="text-xs text-sage-500" aria-live="polite">
                  Step {activePanelIndex + 1} of {storyPanels.length}
                </p>
                <Button variant="outline" onClick={() => goToPanel(activePanelIndex + 1)} disabled={activePanelIndex >= storyPanels.length - 1} className="gap-1.5">
                  Next step
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : storyPanels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {storyPanels.map((panel, index) => {
              const emotionKey = panel.emotion ?? "calm";
              const colorClass = EMOTION_COLORS[emotionKey];
              const emoji = EMOTION_EMOJIS[emotionKey];
              const localized = getSocialStoryPanelContent(panel, selectedLanguage);
              const visual = getSocialStoryVisual(panel, selectedLanguage);

              return (
                <div
                  key={panel.sequence}
                  className={`rounded-2xl border-2 p-5 text-left ${colorClass} print-page-break-avoid focus-calm`}
                >
                  {/* Panel number */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-sage-500 bg-white rounded-full w-6 h-6 flex items-center justify-center border border-sage-200">
                      {panel.sequence}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xl">{emoji}</span>
                      {isEditing && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void applyAiAssist(index)}
                            disabled={aiAssistingIndex === index}
                            className="h-7 w-7 p-0"
                            aria-label="AI assist this step"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStoryPanels((current) => duplicateSocialStoryPanel(current, index))}
                            className="h-7 w-7 p-0"
                            aria-label="Duplicate step"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStoryPanels((current) => removeSocialStoryPanel(current, index));
                              setActivePanelIndex((current) => Math.max(0, Math.min(current, storyPanels.length - 2)));
                            }}
                            disabled={storyPanels.length <= 1}
                            className="h-7 w-7 p-0"
                            aria-label="Delete step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStoryPanels((current) => moveSocialStoryPanel(current, index, -1))}
                            disabled={index === 0}
                            className="h-7 w-7 p-0"
                            aria-label="Move step earlier"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStoryPanels((current) => moveSocialStoryPanel(current, index, 1))}
                            disabled={index >= storyPanels.length - 1}
                            className="h-7 w-7 p-0"
                            aria-label="Move step later"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Image placeholder (shows imagePrompt as description for now) */}
                  {panel.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={panel.imageUrl}
                      alt={localized.title}
                      className="w-full aspect-video object-cover rounded-xl mb-3 bg-sage-100"
                    />
                  ) : (
                    <div className={`w-full aspect-video rounded-xl mb-3 border border-current/10 bg-gradient-to-br ${visual.cardClass} flex flex-col items-center justify-center px-4 text-center`}>
                      <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm ${visual.accentClass}`}>
                        {visual.icon}
                      </div>
                      <p className="text-xs font-semibold text-sage-700">{visual.label}</p>
                      <p className="text-[11px] text-sage-500 mt-1 italic">
                        {panel.imagePrompt ?? "Calm visual cue"}
                      </p>
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="font-bold text-sage-900 text-base mb-2">
                    {localized.title}
                  </h3>

                  {/* Text — large, clear */}
                  <p className="text-sage-800 leading-relaxed text-base">
                    {localized.text}
                  </p>

                  {isEditing && (
                    <div className="mt-3 space-y-2 no-print">
                      <input
                        type="text"
                        value={localized.title}
                        onChange={(e) => updatePanelField(index, "title", e.target.value)}
                        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-xs text-sage-800"
                        aria-label={`Edit step ${panel.sequence} title`}
                      />
                      <textarea
                        value={localized.text}
                        onChange={(e) => updatePanelField(index, "text", e.target.value)}
                        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-xs text-sage-800 min-h-20"
                        aria-label={`Edit step ${panel.sequence} text`}
                      />
                      <label className="text-xs text-sage-600 block">
                        Upload image for this frame
                        <input
                          id={`social-story-upload-${index}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="mt-1 block w-full text-xs"
                          aria-describedby={
                            uploadErrors[index]
                              ? `social-story-upload-error-${index}`
                              : undefined
                          }
                          onChange={(e) => {
                            void handleImageUpload(index, e.target.files?.[0]);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {uploadErrors[index] && (
                        <p
                          id={`social-story-upload-error-${index}`}
                          className="text-xs text-red-600"
                          role="status"
                          aria-live="polite"
                        >
                          {uploadErrors[index]}
                        </p>
                      )}
                    </div>
                  )}

                  {(localized.sensoryCue || localized.supportTip || (localized.keywords?.length ?? 0) > 0) && (
                    <div className="mt-3 space-y-2">
                      {localized.sensoryCue && (
                        <p className="text-xs text-sage-600"><span className="font-semibold">Sensory cue:</span> {localized.sensoryCue}</p>
                      )}
                      {localized.supportTip && (
                        <p className="text-xs text-sage-600"><span className="font-semibold">Support tip:</span> {localized.supportTip}</p>
                      )}
                      {(localized.keywords?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {localized.keywords?.map((keyword) => (
                            <span key={`${panel.sequence}-${keyword}`} className="rounded-full bg-white/80 border border-current/10 px-2 py-0.5 text-[11px] text-sage-600">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActivePanelIndex(index);
                      speakPanel(panel);
                    }}
                    className="mt-3 gap-1.5 no-print"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Speak step
                  </Button>
                </div>
              );
            })}
          </div>
          ) : null}

          {/* Print footer */}
          <div className="hidden print:block mt-8 text-center text-xs text-gray-400 border-t pt-4">
            Created with Pathwise — pathwise.app
          </div>
        </div>
      </div>
    </div>
  );
}
