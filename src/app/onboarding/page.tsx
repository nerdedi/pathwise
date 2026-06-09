"use client";

import type { SensoryProfile } from "@/types/sensory-profile";
import { defaultSensoryProfile } from "@/types/sensory-profile";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Heart,
    Loader2,
    Sun,
    Users,
    Volume2,
    Wind,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Step = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
};

const steps: Step[] = [
  {
    id: "welcome",
    title: "Welcome to Pathwise",
    subtitle:
      "Let's get to know what helps you feel comfortable. There are no wrong answers — this is about you.",
    icon: <Heart className="w-8 h-8 text-sage-500" />,
  },
  {
    id: "sensory",
    title: "Your senses",
    subtitle:
      "How do you usually feel about these things? We'll use this to tailor your guides.",
    icon: <Volume2 className="w-8 h-8 text-sage-500" />,
  },
  {
    id: "visiting",
    title: "Your visit",
    subtitle: "Tell us a bit about how you usually visit new places.",
    icon: <Users className="w-8 h-8 text-sage-500" />,
  },
  {
    id: "needs",
    title: "What helps you",
    subtitle:
      "Select anything that applies. This helps us know what to include in your guide.",
    icon: <Sun className="w-8 h-8 text-sage-500" />,
  },
  {
    id: "preferences",
    title: "Guide preferences",
    subtitle: "How would you like your itinerary to look and feel?",
    icon: <Wind className="w-8 h-8 text-sage-500" />,
  },
];

const sensitivityLabels = {
  low: { label: "Not bothered", emoji: "😌", color: "border-sage-400 bg-sage-50 text-sage-700" },
  medium: { label: "Sometimes difficult", emoji: "😐", color: "border-warm-400 bg-warm-50 text-warm-700" },
  high: { label: "Very challenging", emoji: "😣", color: "border-red-400 bg-red-50 text-red-700" },
};

type SensorySensitivity = "low" | "medium" | "high";

function SensitivityPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SensorySensitivity;
  onChange: (v: SensorySensitivity) => void;
}) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-sage-800 mb-2">{label}</p>
      <div className="flex gap-2">
        {(["low", "medium", "high"] as SensorySensitivity[]).map((level) => {
          const meta = sensitivityLabels[level];
          const isSelected = value === level;
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all focus-calm ${
                isSelected
                  ? meta.color + " border-opacity-100"
                  : "border-sage-200 bg-white text-sage-600 hover:border-sage-300"
              }`}
              aria-pressed={isSelected}
            >
              {meta.emoji} {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckOption({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all focus-calm ${
        checked
          ? "border-sage-400 bg-sage-50"
          : "border-sage-100 bg-white hover:border-sage-200"
      }`}
      aria-pressed={checked}
    >
      <CheckCircle2
        className={`w-5 h-5 mt-0.5 shrink-0 transition-colors ${
          checked ? "text-sage-600" : "text-sage-200"
        }`}
      />
      <div>
        <p className="text-sm font-medium text-sage-800">{label}</p>
        {description && (
          <p className="text-xs text-sage-500 mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<SensoryProfile>(defaultSensoryProfile);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const update = <K extends keyof SensoryProfile>(key: K, value: SensoryProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Always try local first for instant UX
        const stored = localStorage.getItem("pathwise_sensory_profile");
        if (stored) {
          setProfile(JSON.parse(stored) as SensoryProfile);
        }

        // Then try authenticated server profile (if signed in)
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile as SensoryProfile);
            localStorage.setItem("pathwise_sensory_profile", JSON.stringify(data.profile));
          }
        }
      } catch {
        // Non-blocking: defaults/local still work
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const handleFinish = async () => {
    setFinishing(true);
    // Always keep local copy
    localStorage.setItem("pathwise_sensory_profile", JSON.stringify(profile));

    // Best-effort save for authenticated users
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
    } catch {
      // non-blocking
    }

    router.push("/plan");
  };

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sage-50 to-white">
        <Loader2 className="w-6 h-6 text-sage-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50 to-white flex flex-col">
      {/* Progress */}
      <div className="bg-white border-b border-sage-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between mb-2">
          <span className="text-xs text-sage-500 font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-xs text-sage-500">
            {Math.round(((currentStep + 1) / steps.length) * 100)}% complete
          </span>
        </div>
        <div className="max-w-lg mx-auto h-2 bg-sage-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-sage-500 rounded-full transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemax={steps.length}
          />
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-sage-100 rounded-2xl mb-4">
                  {steps[currentStep].icon}
                </div>
                <h1 className="text-2xl font-bold text-sage-900 mb-2">
                  {steps[currentStep].title}
                </h1>
                <p className="text-sage-600 text-sm leading-relaxed max-w-sm mx-auto">
                  {steps[currentStep].subtitle}
                </p>
              </div>

              {/* Step content */}
              <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6">
                {currentStep === 0 && (
                  <div className="space-y-4 text-center">
                    <p className="text-sage-700 leading-relaxed">
                      Pathwise creates personalised guides for new venues and
                      activities. We know that knowing what to expect is
                      important — and that everyone&rsquo;s needs are different.
                    </p>
                    <div className="bg-lavender-50 rounded-xl p-4 text-sm text-lavender-700 leading-relaxed">
                      ✨ This profile is yours. You can skip any question, change
                      your answers any time, and create as many guides as you
                      like.
                    </div>
                    <p className="text-xs text-sage-500">
                      You can also skip this step and go straight to planning a
                      visit.
                    </p>
                  </div>
                )}

                {currentStep === 1 && (
                  <div>
                    <SensitivityPicker
                      label="Sound & noise"
                      value={profile.soundSensitivity}
                      onChange={(v) => update("soundSensitivity", v)}
                    />
                    <SensitivityPicker
                      label="Bright lights or visual busy-ness"
                      value={profile.lightSensitivity}
                      onChange={(v) => update("lightSensitivity", v)}
                    />
                    <SensitivityPicker
                      label="Strong smells"
                      value={profile.smellSensitivity}
                      onChange={(v) => update("smellSensitivity", v)}
                    />
                    <SensitivityPicker
                      label="Crowds and being near people"
                      value={profile.crowdSensitivity}
                      onChange={(v) => update("crowdSensitivity", v)}
                    />
                    <SensitivityPicker
                      label="Unexpected changes to plans"
                      value={profile.changeSensitivity}
                      onChange={(v) => update("changeSensitivity", v)}
                    />
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-sage-800 mb-3">
                      I usually visit new places:
                    </p>
                    {(
                      [
                        { value: "alone", label: "By myself" },
                        { value: "support-person", label: "With a support person" },
                        { value: "family", label: "With family" },
                        { value: "group", label: "With a group" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => update("visitingWith", opt.value)}
                        className={`w-full py-3 px-4 rounded-xl border-2 text-sm font-medium text-left transition-all focus-calm ${
                          profile.visitingWith === opt.value
                            ? "border-sage-400 bg-sage-50 text-sage-800"
                            : "border-sage-100 bg-white text-sage-600 hover:border-sage-200"
                        }`}
                        aria-pressed={profile.visitingWith === opt.value}
                      >
                        {opt.label}
                      </button>
                    ))}

                    <p className="text-sm font-medium text-sage-800 mt-5 mb-3">
                      How much detail do you want in your guide?
                    </p>
                    {(
                      [
                        {
                          value: "basic",
                          label: "Just the basics",
                          description: "Key facts, simple layout — less to read",
                        },
                        {
                          value: "detailed",
                          label: "Detailed",
                          description: "Full info with tips and explanations",
                        },
                        {
                          value: "comprehensive",
                          label: "Tell me everything",
                          description:
                            "Every detail, every contingency — I like to be fully prepared",
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => update("detailLevel", opt.value)}
                        className={`w-full py-3 px-4 rounded-xl border-2 text-sm text-left transition-all focus-calm ${
                          profile.detailLevel === opt.value
                            ? "border-sage-400 bg-sage-50"
                            : "border-sage-100 bg-white hover:border-sage-200"
                        }`}
                        aria-pressed={profile.detailLevel === opt.value}
                      >
                        <span className="font-medium text-sage-800">
                          {opt.label}
                        </span>
                        <span className="block text-xs text-sage-500 mt-0.5">
                          {opt.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-2">
                    <CheckOption
                      checked={profile.needsQuietSpace}
                      label="I need to know where quiet spaces are"
                      description="Rooms or areas away from noise and crowds"
                      onChange={(v) => update("needsQuietSpace", v)}
                    />
                    <CheckOption
                      checked={profile.needsAccessibleToilet}
                      label="I need accessible toilet information"
                      onChange={(v) => update("needsAccessibleToilet", v)}
                    />
                    <CheckOption
                      checked={profile.needsMobilityAccess}
                      label="I need step-free / wheelchair access routes"
                      onChange={(v) => update("needsMobilityAccess", v)}
                    />
                    <CheckOption
                      checked={profile.needsDietaryInfo}
                      label="I need detailed dietary / allergy information"
                      description="For cafeterias and what to pack"
                      onChange={(v) => update("needsDietaryInfo", v)}
                    />
                    <CheckOption
                      checked={profile.hasMedicalNeeds}
                      label="I have medical needs to consider"
                      description="We'll remind you of things like medication, first aid location"
                      onChange={(v) => update("hasMedicalNeeds", v)}
                    />
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-2">
                    <CheckOption
                      checked={profile.wantsSocialStory}
                      label="Generate a printable visual social story"
                      description="Simple language + visuals you can read the night before"
                      onChange={(v) => update("wantsSocialStory", v)}
                    />
                    <CheckOption
                      checked={profile.wantsAffirmations}
                      label="Include calming affirmations and tips"
                      description="Gentle reminders throughout your guide"
                      onChange={(v) => update("wantsAffirmations", v)}
                    />
                    <CheckOption
                      checked={profile.prefersDyslexicFont}
                      label="Use dyslexia-friendly font (OpenDyslexic)"
                      onChange={(v) => update("prefersDyslexicFont", v)}
                    />
                    <CheckOption
                      checked={profile.prefersHighContrast}
                      label="High contrast colours"
                      description="Stronger contrast for easier reading"
                      onChange={(v) => update("prefersHighContrast", v)}
                    />
                    <CheckOption
                      checked={profile.prefersReducedMotion}
                      label="Reduced animations and motion"
                      onChange={(v) => update("prefersReducedMotion", v)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {!isFirst && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-sage-200 text-sage-700 font-medium text-sm hover:bg-sage-50 transition-colors focus-calm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              disabled={finishing}
              onClick={isLast ? handleFinish : () => setCurrentStep((s) => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 bg-sage-600 hover:bg-sage-700 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors focus-calm"
            >
              {isLast ? (finishing ? "Saving…" : "Create my guide") : "Continue"}
              {isLast && finishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {currentStep === 0 && (
            <button
              onClick={() => router.push("/plan")}
              className="w-full mt-3 py-2.5 text-xs text-sage-400 hover:text-sage-600 transition-colors focus-calm"
            >
              Skip this step — take me straight to planning
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
