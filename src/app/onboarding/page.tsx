"use client";

import { Input } from "@/components/ui/input";
import {
    LOCAL_TEST_EMAIL,
    LOCAL_TEST_PASSWORD,
    isLikelyAuthInfrastructureIssue,
    persistLocalTestLogin,
} from "@/lib/local-auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const supabase = useMemo(() => createClient(), []);
  const authConfigured = useMemo(() => isSupabaseAuthConfigured(), []);
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<SensoryProfile>(defaultSensoryProfile);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const useLocalTestLogin = (email = LOCAL_TEST_EMAIL, password = LOCAL_TEST_PASSWORD) => {
    if (password.length < 8) {
      throw new Error("Use at least 8 characters for your password.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Enter a valid email address.");
    }

    persistLocalTestLogin(normalizedEmail);
    setUserEmail(normalizedEmail);
    setAuthMessage(
      "Local test login enabled. Your profile will save on this device (cloud sync is off until Supabase is configured)."
    );
  };

  const update = <K extends keyof SensoryProfile>(key: K, value: SensoryProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const updateEmergencyContact = (
    index: number,
    field: "name" | "phone" | "relationship",
    value: string
  ) => {
    setProfile((prev) => {
      const next = [...prev.emergencyContacts];
      while (next.length <= index) {
        next.push({ name: "", phone: "", relationship: "" });
      }
      next[index] = { ...next[index], [field]: value };
      return { ...prev, emergencyContacts: next };
    });
  };

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const loadProfile = async () => {
      if (!authConfigured) {
        const localEmail = localStorage.getItem("pathwise_local_user_email");
        if (mounted) {
          setUserEmail(localEmail);
          setLoadingProfile(false);
        }
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        setUserEmail(user?.email ?? null);

        // Always try local first for instant UX
        const stored = localStorage.getItem("pathwise_sensory_profile");
        if (stored) {
          setProfile({
            ...defaultSensoryProfile,
            ...(JSON.parse(stored) as SensoryProfile),
          });
        }

        // Then try authenticated server profile (if signed in)
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            const merged = {
              ...defaultSensoryProfile,
              ...(data.profile as SensoryProfile),
            };
            setProfile(merged);
            localStorage.setItem("pathwise_sensory_profile", JSON.stringify(merged));
          }
        }
      } catch {
        // Non-blocking: defaults/local still work
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();

    if (authConfigured) {
      const authListener = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUserEmail(session?.user?.email ?? null);
      });
      subscription = authListener.data.subscription;
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, authConfigured]);

  const handleAccountSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    try {
      if (!authConfigured) {
        useLocalTestLogin(authEmail, authPassword);
        return;
      }

      if (authMode === "signup") {
        if (authPassword.length < 8) {
          throw new Error("Use at least 8 characters for your password.");
        }

        if (authPassword !== confirmPassword) {
          throw new Error("Your passwords do not match.");
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback?next=/onboarding`
                : undefined,
          },
        });

        if (error) throw error;

        if (data.session || data.user?.email) {
          setUserEmail(data.user?.email ?? authEmail);
          setAuthMessage("Account created. Let’s personalise your profile.");
        } else {
          setAuthMessage("Check your email to confirm your account, then come back to finish your profile.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) throw error;

        setUserEmail(data.user.email ?? authEmail);
        setAuthMessage("Signed in. You can continue with your profile now.");
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production" && isLikelyAuthInfrastructureIssue(error)) {
        try {
          useLocalTestLogin(authEmail || LOCAL_TEST_EMAIL, authPassword || LOCAL_TEST_PASSWORD);
          setAuthError("");
          setAuthMessage(
            "Supabase auth wasn’t reachable, so Pathwise switched to local test login for this device."
          );
          return;
        } catch (localLoginError) {
          setAuthError(
            localLoginError instanceof Error ? localLoginError.message : "Authentication failed."
          );
          return;
        }
      }

      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    const cleanedProfile: SensoryProfile = {
      ...profile,
      emergencyContacts: profile.emergencyContacts.filter(
        (contact) => contact.name.trim() && contact.phone.trim()
      ),
    };
    // Always keep local copy
    localStorage.setItem("pathwise_sensory_profile", JSON.stringify(cleanedProfile));

    // Best-effort save for authenticated users
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: cleanedProfile }),
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

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sage-50 to-white flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl border border-sage-100 shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-sage-100 rounded-2xl mb-4">
              <Heart className="w-7 h-7 text-sage-500" />
            </div>
            <h1 className="text-2xl font-bold text-sage-900">
              {authMode === "signup" ? "Create your Pathwise profile" : "Log in to continue"}
            </h1>
            <p className="text-sm text-sage-600 mt-2 leading-relaxed">
              {authMode === "signup"
                ? "Set up your account with an email and password first, then we’ll tailor your sensory profile."
                : "Sign in with your email and password to edit your profile and saved guides."}
            </p>
          </div>

          <div className="flex rounded-xl bg-sage-50 p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
                setAuthMessage("");
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                authMode === "signup"
                  ? "bg-white text-sage-800 shadow-sm"
                  : "text-sage-500 hover:text-sage-700"
              }`}
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setAuthMessage("");
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                authMode === "login"
                  ? "bg-white text-sage-800 shadow-sm"
                  : "text-sage-500 hover:text-sage-700"
              }`}
            >
              Log in
            </button>
          </div>

          <form onSubmit={handleAccountSubmit} className="space-y-4">
            {!authConfigured && (
              <p className="text-sm text-warm-700 bg-warm-50 border border-warm-200 rounded-xl px-4 py-3">
                Auth backend isn&rsquo;t configured in this environment yet. You can still continue with a local test login.
              </p>
            )}
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Password"
              placeholder={authMode === "signup" ? "At least 8 characters" : "Enter your password"}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
            />
            {authMode === "signup" && (
              <Input
                type="password"
                label="Confirm password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            )}

            {authError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {authError}
              </p>
            )}
            {authMessage && (
              <p className="text-sm text-sage-700 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
                {authMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 bg-sage-600 hover:bg-sage-700 disabled:opacity-70 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors focus-calm"
            >
              {authLoading
                ? authMode === "signup"
                  ? "Creating account…"
                  : "Logging in…"
                : !authConfigured
                  ? "Continue with local test login"
                  : authMode === "signup"
                  ? "Create account"
                  : "Log in"}
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>

            {(process.env.NODE_ENV !== "production" || !authConfigured) && (
              <button
                type="button"
                onClick={() => {
                  setAuthEmail(LOCAL_TEST_EMAIL);
                  setAuthPassword(LOCAL_TEST_PASSWORD);
                  setConfirmPassword(LOCAL_TEST_PASSWORD);
                }}
                className="w-full text-xs text-sage-600 underline underline-offset-4"
              >
                Use test credentials (test@pathwise.local / pathwise123)
              </button>
            )}
          </form>

          <div className="mt-5 text-center space-y-2">
            <p className="text-xs text-sage-500">
              Prefer to browse first? You can still <Link href="/plan" className="underline underline-offset-4">skip straight to planning</Link>.
            </p>
            <p className="text-xs text-sage-500">
              Want your saved guides instead? <Link href="/guides" className="underline underline-offset-4">Go to login</Link>.
            </p>
          </div>
        </div>
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

                    <p className="text-sm font-medium text-sage-800 mt-5 mb-3">
                      Which route style helps most?
                    </p>
                    {(
                      [
                        { value: "balanced", label: "Balanced", description: "A calm mix of time and simplicity" },
                        { value: "fastest", label: "Fastest", description: "Get there quickly" },
                        { value: "quietest", label: "Quietest", description: "Prefer lower-stress, calmer travel" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => update("routePreference", opt.value)}
                        className={`w-full py-3 px-4 rounded-xl border-2 text-sm text-left transition-all focus-calm ${
                          profile.routePreference === opt.value
                            ? "border-sage-400 bg-sage-50"
                            : "border-sage-100 bg-white hover:border-sage-200"
                        }`}
                        aria-pressed={profile.routePreference === opt.value}
                      >
                        <span className="font-medium text-sage-800">{opt.label}</span>
                        <span className="block text-xs text-sage-500 mt-0.5">{opt.description}</span>
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
                    <CheckOption
                      checked={profile.needsLevelBoardingInfo}
                      label="I need level boarding information"
                      description="Helpful for wheelchair users and easier boarding"
                      onChange={(v) => update("needsLevelBoardingInfo", v)}
                    />
                    <CheckOption
                      checked={profile.needsLiveLiftInfo}
                      label="I need live lift status reminders"
                      description="Show station lift reminders in transport plans"
                      onChange={(v) => update("needsLiveLiftInfo", v)}
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
                    <CheckOption
                      checked={profile.wantsTextToSpeech}
                      label="Include text-to-speech support"
                      description="Read support text aloud in overwhelming moments"
                      onChange={(v) => update("wantsTextToSpeech", v)}
                    />

                    <div className="pt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-sage-800 mb-1">
                          Support card name (optional)
                        </label>
                        <input
                          value={profile.supportCardName}
                          onChange={(e) => update("supportCardName", e.target.value)}
                          placeholder="Your name"
                          className="w-full h-11 rounded-xl border border-sage-200 px-4 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-sage-800 mb-1">
                          What should your support card say?
                        </label>
                        <textarea
                          value={profile.supportCardMessage}
                          onChange={(e) => update("supportCardMessage", e.target.value)}
                          placeholder="I may need clear, calm instructions and a little extra time."
                          className="w-full min-h-24 rounded-xl border border-sage-200 px-4 py-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                        />
                      </div>
                      {[0, 1].map((index) => (
                        <div key={index} className="rounded-xl border border-sage-100 p-3 space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
                            Emergency contact {index + 1}
                          </p>
                          <input
                            value={profile.emergencyContacts[index]?.name ?? ""}
                            onChange={(e) => updateEmergencyContact(index, "name", e.target.value)}
                            placeholder="Name"
                            className="w-full h-10 rounded-xl border border-sage-200 px-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                          />
                          <input
                            value={profile.emergencyContacts[index]?.relationship ?? ""}
                            onChange={(e) => updateEmergencyContact(index, "relationship", e.target.value)}
                            placeholder="Relationship (optional)"
                            className="w-full h-10 rounded-xl border border-sage-200 px-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                          />
                          <input
                            value={profile.emergencyContacts[index]?.phone ?? ""}
                            onChange={(e) => updateEmergencyContact(index, "phone", e.target.value)}
                            placeholder="Phone number"
                            className="w-full h-10 rounded-xl border border-sage-200 px-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                          />
                        </div>
                      ))}
                    </div>
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
