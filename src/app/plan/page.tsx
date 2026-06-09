"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Calendar, Loader2, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PlanPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [suburb, setSuburb] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "scraping" | "generating">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a venue URL");
      return;
    }

    try {
      setLoading(true);
      setStep("scraping");

      // Load sensory profile from localStorage (set in onboarding)
      let sensoryProfile = {};
      try {
        const stored = localStorage.getItem("pathwise_sensory_profile");
        if (stored) {
          sensoryProfile = JSON.parse(stored);
        } else {
          // Fallback to server profile for signed-in users
          const profileRes = await fetch("/api/profile", { cache: "no-store" });
          if (profileRes.ok) {
            const data = await profileRes.json();
            if (data.profile) {
              sensoryProfile = data.profile;
              localStorage.setItem(
                "pathwise_sensory_profile",
                JSON.stringify(data.profile)
              );
            }
          }
        }
      } catch {
        // ignore
      }

      // Step 1: Scrape venue
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!scrapeRes.ok) {
        const data = await scrapeRes.json();
        throw new Error(data.error ?? "Failed to load venue information");
      }

      const { venueData } = await scrapeRes.json();

      // Step 2: Generate itinerary
      setStep("generating");
      const itinRes = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueData,
          sensoryProfile,
          visitDate: visitDate || undefined,
          fromSuburb: suburb || undefined,
        }),
      });

      if (!itinRes.ok) {
        const data = await itinRes.json();
        throw new Error(data.error ?? "Failed to generate itinerary");
      }

      const { itinerary } = await itinRes.json();

      // Store and redirect to itinerary view
      sessionStorage.setItem(`pathwise_itinerary_${itinerary.id}`, JSON.stringify(itinerary));

      // Best-effort save for authenticated users
      try {
        await fetch("/api/guides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itinerary }),
        });
      } catch {
        // non-blocking: local session copy still works
      }

      router.push(`/plan/${itinerary.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setStep("idle");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50 to-white">
      {/* Nav */}
      <nav className="bg-white border-b border-sage-100 px-4 h-14 flex items-center">
        <div className="flex items-center justify-between w-full max-w-xl mx-auto">
          <Link href="/" className="flex items-center gap-2 text-sage-800 font-semibold">
          <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          Pathwise
          </Link>
          <Link href="/guides" className="text-sm text-sage-600 hover:text-sage-800">
            My guides
          </Link>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 pt-12 pb-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-sage-900 mb-2">
            Where are you heading?
          </h1>
          <p className="text-sage-600 text-sm">
            Paste the venue website link below and we&rsquo;ll build your personalised guide.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6 space-y-5">
          <Input
            label="Venue website URL"
            hint="e.g. https://australianmuseum.net.au or https://taronga.org.au"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            required
            disabled={loading}
            error={error && !url ? error : undefined}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Your suburb (optional)"
              hint="For transport planning"
              type="text"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              placeholder="e.g. Parramatta"
              disabled={loading}
            />
            <Input
              label="Visit date (optional)"
              hint="For weather forecast"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              disabled={loading}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {step === "scraping"
                  ? "Reading venue website…"
                  : "Building your guide…"}
              </>
            ) : (
              <>
                Build my guide
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Loading progress */}
        {loading && (
          <div className="mt-6 space-y-3">
            <Step
              active={step === "scraping"}
              done={step === "generating"}
              icon={<MapPin className="w-4 h-4" />}
              label="Reading venue website"
              detail="Collecting accessibility info, facilities, menus…"
            />
            <Step
              active={step === "generating"}
              done={false}
              icon={<Calendar className="w-4 h-4" />}
              label="Building your personalised guide"
              detail="Weather, transport, sensory tips, packing list…"
            />
          </div>
        )}

        {!loading && (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-center text-sage-400 font-medium uppercase tracking-wide">
              Popular venues to try
            </p>
            {[
              {
                name: "Australian Museum",
                url: "https://australianmuseum.net.au",
                suburb: "Sydney CBD",
              },
              {
                name: "Taronga Zoo",
                url: "https://taronga.org.au",
                suburb: "Mosman",
              },
              {
                name: "Powerhouse Museum",
                url: "https://powerhouse.com.au",
                suburb: "Ultimo",
              },
            ].map((venue) => (
              <button
                key={venue.url}
                type="button"
                onClick={() => setUrl(venue.url)}
                className="w-full flex items-center gap-3 p-3 bg-white border border-sage-100 rounded-xl text-sm text-left hover:border-sage-300 transition-colors focus-calm"
              >
                <Navigation className="w-3.5 h-3.5 text-sage-400 shrink-0" />
                <div>
                  <span className="font-medium text-sage-800">{venue.name}</span>
                  <span className="text-sage-400 ml-2">{venue.suburb}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-center text-sage-400 mt-6">
          Don&rsquo;t have a sensory profile yet?{" "}
          <Link href="/onboarding" className="text-sage-600 underline">
            Set one up here
          </Link>{" "}
          — it only takes 2 minutes.
        </p>
      </div>
    </div>
  );
}

function Step({
  active,
  done,
  icon,
  label,
  detail,
}: {
  active: boolean;
  done: boolean;
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        active
          ? "border-sage-300 bg-sage-50"
          : done
          ? "border-sage-200 bg-white opacity-60"
          : "border-sage-100 bg-white opacity-40"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          active ? "bg-sage-500 text-white" : done ? "bg-sage-200 text-sage-600" : "bg-sage-100 text-sage-400"
        }`}
      >
        {active ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      </div>
      <div>
        <p className="text-sm font-medium text-sage-800">{label}</p>
        <p className="text-xs text-sage-500">{detail}</p>
      </div>
    </div>
  );
}
