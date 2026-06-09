"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherDay } from "@/lib/weather";
import { getWeatherPackingTips } from "@/lib/weather";
import type { Itinerary } from "@/types/itinerary";
import {
    BookOpen,
    ChevronDown,
    ChevronUp,
    Download,
    Edit3,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Printer,
    RefreshCw,
    Save,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import AffirmationCard from "./affirmation-card";
import OverwhelmedPlan from "./overwhelmed-plan";
import PackingList from "./packing-list";
import RiskAssessment from "./risk-assessment";
import SupportToolkit from "./support-toolkit";
import TransportSection from "./transport-section";
import VenueMap from "./venue-map";
import WeatherCard from "./weather-card";

interface ItineraryViewProps {
  itinerary: Itinerary;
  allowEditing?: boolean;
}

type CommunityEntry = {
  id: string;
  overall_rating: number | null;
  notes: string | null;
  tips: string | null;
  visit_date: string | null;
  helpful_count: number | null;
  created_at: string;
};

function SectionCard({
  section,
  editable,
  onUpdate,
  onRegenerate,
  regenerating,
}: {
  section: Itinerary["sections"][0];
  editable?: boolean;
  onUpdate?: (patch: Partial<Itinerary["sections"][0]>) => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const [open, setOpen] = useState(!section.isExpandable);

  return (
    <Card>
      <button
        onClick={() => section.isExpandable && setOpen((o) => !o)}
        className="w-full text-left focus-calm"
        aria-expanded={open}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <span className="text-xl">{section.emoji}</span>
              {section.title}
            </span>
            {section.isExpandable &&
              (open ? (
                <ChevronUp className="w-4 h-4 text-sage-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-sage-400" />
              ))}
          </CardTitle>
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pt-0">
          {editable ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onRegenerate}
                  disabled={regenerating}
                  className="gap-1.5"
                >
                  {regenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Regenerate section
                </Button>
              </div>
              <textarea
                value={section.content}
                onChange={(e) => onUpdate?.({ content: e.target.value })}
                className="w-full min-h-24 text-sm text-sage-700 border border-sage-200 rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
              />
              <div>
                <p className="text-xs text-sage-500 mb-1">Details (one per line)</p>
                <textarea
                  value={(section.details ?? []).join("\n")}
                  onChange={(e) =>
                    onUpdate?.({
                      details: e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full min-h-24 text-sm text-sage-700 border border-sage-200 rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-sage-700 leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
              {section.details && section.details.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {section.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-sage-700">
                      <span className="text-sage-400 mt-0.5">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ItineraryView({ itinerary, allowEditing = true }: ItineraryViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });
  const [draftItinerary, setDraftItinerary] = useState<Itinerary>(itinerary);
  const [editMode, setEditMode] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);
  const [communityEntries, setCommunityEntries] = useState<CommunityEntry[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityRating, setCommunityRating] = useState(5);
  const [communityNotes, setCommunityNotes] = useState("");
  const [communityTips, setCommunityTips] = useState("");
  const [submittingCommunity, setSubmittingCommunity] = useState(false);
  const [shareEmail, setShareEmail] = useState("");

  const venue = draftItinerary.venueData;
  const weatherPackingTips = draftItinerary.weather
    ? getWeatherPackingTips(draftItinerary.weather as unknown as WeatherDay)
    : [];

  const updateSection = (sectionId: string, patch: Partial<Itinerary["sections"][0]>) => {
    setDraftItinerary((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    }));
  };

  const persistItinerary = async (nextItinerary: Itinerary, successMessage = "Saved to your account.") => {
    sessionStorage.setItem(
      `pathwise_itinerary_${nextItinerary.id}`,
      JSON.stringify(nextItinerary)
    );

    try {
      const res = await fetch(`/api/guides/${nextItinerary.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: nextItinerary }),
      });

      if (res.ok) {
        setSaveMessage(successMessage);
      } else if (res.status === 401) {
        setSaveMessage("Saved on this device only (sign in to sync).");
      } else {
        setSaveMessage("Saved on this device. Cloud save failed.");
      }
    } catch {
      setSaveMessage("Saved on this device. Cloud save failed.");
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    setSaveMessage("");

    try {
      await persistItinerary(draftItinerary);
    } finally {
      setSaving(false);
      setEditMode(false);
    }
  };

  const regenerateSection = async (sectionId: string) => {
    setRegeneratingSectionId(sectionId);
    setSaveMessage("");

    try {
      const res = await fetch("/api/itinerary/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: draftItinerary, sectionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to regenerate section");
      }

      const data = await res.json();
      const nextItinerary = {
        ...draftItinerary,
        sections: draftItinerary.sections.map((section) =>
          section.id === sectionId ? data.section : section
        ),
      };

      setDraftItinerary(nextItinerary);
      await persistItinerary(nextItinerary, "Section regenerated and saved.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to regenerate section.");
    } finally {
      setRegeneratingSectionId(null);
    }
  };

  const addSharedEmail = () => {
    const email = shareEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setSaveMessage("Enter a valid email to share this plan.");
      return;
    }

    if ((draftItinerary.sharedWithEmails ?? []).includes(email)) {
      setSaveMessage("That email already has access.");
      return;
    }

    setDraftItinerary((prev) => ({
      ...prev,
      sharedWithEmails: [...(prev.sharedWithEmails ?? []), email],
    }));
    setShareEmail("");
    setSaveMessage("Collaborator added. Save changes to sync.");
  };

  const removeSharedEmail = (email: string) => {
    setDraftItinerary((prev) => ({
      ...prev,
      sharedWithEmails: (prev.sharedWithEmails ?? []).filter((item) => item !== email),
    }));
    setSaveMessage("Collaborator removed. Save changes to sync.");
  };

  const loadCommunity = useCallback(async () => {
    try {
      setCommunityLoading(true);
      const res = await fetch(`/api/community?venueUrl=${encodeURIComponent(venue.url)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load community notes");
      const data = await res.json();
      setCommunityEntries((data.entries ?? []) as CommunityEntry[]);
    } catch {
      setCommunityEntries([]);
    } finally {
      setCommunityLoading(false);
    }
  }, [venue.url]);

  const submitCommunity = async () => {
    setSubmittingCommunity(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueUrl: venue.url,
          venueName: venue.name,
          venueSuburb: venue.suburb,
          overallRating: communityRating,
          notes: communityNotes || undefined,
          tips: communityTips || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save community note");
      }

      setCommunityNotes("");
      setCommunityTips("");
      setSaveMessage("Community note shared.");
      await loadCommunity();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save community note.");
    } finally {
      setSubmittingCommunity(false);
    }
  };

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sage-500 text-sm mb-1">
              <MapPin className="w-3.5 h-3.5" />
              {venue.suburb}, NSW
            </div>
            <h1 className="text-3xl font-bold text-sage-900">{venue.name}</h1>
            <p className="text-sage-600 mt-1 text-sm">{venue.address}</p>
            {saveMessage && (
              <p className="text-xs text-sage-600 mt-1">{saveMessage}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap no-print">
            {allowEditing && (
              <>
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode((v) => !v)}
                  className="gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {editMode ? "Cancel edit" : "Edit sections"}
                </Button>
                {editMode && (
                  <Button size="sm" onClick={saveChanges} disabled={saving} className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
            {draftItinerary.venueData && (
              <Link href={`/social-story/${draftItinerary.id}`}>
                <Button variant="calm" size="sm" className="gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Social story
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Quick-glance tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          {venue.peakTimes && (
            <span className="text-xs bg-warm-100 text-warm-700 rounded-full px-3 py-1">
              ⏰ Peak: {venue.peakTimes}
            </span>
          )}
          {venue.quietTimes && (
            <span className="text-xs bg-sage-100 text-sage-700 rounded-full px-3 py-1">
              🤫 Quiet: {venue.quietTimes}
            </span>
          )}
          {venue.overallSensoryRating && (
            <span
              className={`text-xs rounded-full px-3 py-1 ${
                venue.overallSensoryRating === "calm"
                  ? "bg-sage-100 text-sage-700"
                  : venue.overallSensoryRating === "moderate"
                  ? "bg-warm-100 text-warm-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {venue.overallSensoryRating === "calm" ? "😌" : venue.overallSensoryRating === "moderate" ? "😐" : "😣"}{" "}
              {venue.overallSensoryRating.charAt(0).toUpperCase() + venue.overallSensoryRating.slice(1)} environment
            </span>
          )}
        </div>
      </div>

      {/* Affirmations — before you go */}
      {draftItinerary.affirmations.some((a) => a.timing === "before") && (
        <div className="mb-6">
          <AffirmationCard affirmations={draftItinerary.affirmations} timing="before" />
        </div>
      )}

      <div className="space-y-5" ref={printRef}>
        {/* Venue map */}
        {venue.location && venue.facilities && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4 text-sage-500" />
                Venue map
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <VenueMap
                center={venue.location}
                facilities={venue.facilities}
                venueName={venue.name}
              />
            </CardContent>
          </Card>
        )}

        {/* Itinerary sections */}
        {draftItinerary.sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            editable={allowEditing && editMode}
            onUpdate={(patch) => updateSection(section.id, patch)}
            onRegenerate={() => regenerateSection(section.id)}
            regenerating={allowEditing && regeneratingSectionId === section.id}
          />
        ))}

        {allowEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🤝 Shared planning</CardTitle>
              <p className="text-xs text-sage-500 mt-1">
                Share this plan with assistants or trusted people so you can coordinate together.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {draftItinerary.sharedWithEmails && draftItinerary.sharedWithEmails.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {draftItinerary.sharedWithEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-2 rounded-full bg-sage-50 border border-sage-200 px-3 py-1 text-xs text-sage-700"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeSharedEmail(email)}
                        className="text-sage-500 hover:text-sage-700"
                        aria-label={`Remove ${email}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-sage-500">No collaborators added yet.</p>
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="assistant@example.com"
                  className="flex-1 h-10 rounded-xl border border-sage-200 px-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                />
                <Button type="button" variant="outline" onClick={addSharedEmail}>
                  Add
                </Button>
              </div>

              <p className="text-xs text-sage-500">
                Shared people can coordinate the plan. Personal reflections should stay outside shared sections.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🫶 Community tips</CardTitle>
            <p className="text-xs text-sage-500 mt-1">
              Notes from other visitors can help you know what to expect.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {communityLoading ? (
              <p className="text-sm text-sage-500">Loading community notes…</p>
            ) : communityEntries.length === 0 ? (
              <p className="text-sm text-sage-500">No community notes yet for this venue.</p>
            ) : (
              <div className="space-y-3">
                {communityEntries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-sage-100 p-3 bg-sage-50/50">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-xs font-medium text-sage-700">
                        Overall rating: {entry.overall_rating ?? "—"}/10
                      </span>
                      <span className="text-xs text-sage-400">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {entry.notes && <p className="text-sm text-sage-700">{entry.notes}</p>}
                    {entry.tips && <p className="text-sm text-sage-600 mt-1">Tip: {entry.tips}</p>}
                  </div>
                ))}
              </div>
            )}

            {allowEditing && (
              <div className="border-t border-sage-100 pt-4 space-y-3">
                <p className="text-sm font-medium text-sage-800">Share your own note</p>
                <label className="block text-xs text-sage-500">
                  Overall sensory rating (1 calm – 10 intense)
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={communityRating}
                  onChange={(e) => setCommunityRating(Number(e.target.value))}
                  className="w-full"
                />
                <textarea
                  value={communityNotes}
                  onChange={(e) => setCommunityNotes(e.target.value)}
                  placeholder="What stood out about the environment?"
                  className="w-full min-h-20 text-sm text-sage-700 border border-sage-200 rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                />
                <textarea
                  value={communityTips}
                  onChange={(e) => setCommunityTips(e.target.value)}
                  placeholder="Any tip that would help the next visitor?"
                  className="w-full min-h-20 text-sm text-sage-700 border border-sage-200 rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                />
                <Button onClick={submitCommunity} disabled={submittingCommunity} className="gap-2">
                  {submittingCommunity ? "Sharing…" : "Share community note"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weather */}
        {draftItinerary.weather && (
          <WeatherCard
            weather={draftItinerary.weather}
            packingTips={weatherPackingTips}
          />
        )}

        {/* Transport */}
        {draftItinerary.transportTo && (
          <TransportSection
            plan={draftItinerary.transportTo}
            direction="to"
            venueName={venue.name}
          />
        )}
        {draftItinerary.transportFrom && (
          <TransportSection
            plan={draftItinerary.transportFrom}
            direction="from"
            venueName={venue.name}
          />
        )}

        {/* If overwhelmed */}
        <OverwhelmedPlan plan={draftItinerary.crisisPlan} />

        {allowEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🆘 Communication and support</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SupportToolkit profile={draftItinerary.sensoryProfile} showEmergencyContacts={allowEditing} />
            </CardContent>
          </Card>
        )}

        {/* Affirmations — during */}
        {draftItinerary.affirmations.some((a) => a.timing === "during") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💛 While you&rsquo;re there</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <AffirmationCard
                affirmations={draftItinerary.affirmations}
                timing="during"
              />
            </CardContent>
          </Card>
        )}

        {/* Packing list */}
        <PackingList items={draftItinerary.packingList} />

        {/* Risk assessment */}
        <RiskAssessment
          score={draftItinerary.riskScore}
          summary={draftItinerary.riskSummary}
          details={draftItinerary.riskDetails}
        />

        {/* Venue contact */}
        {(venue.phoneNumber || venue.accessibilityPhone || venue.email) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📞 Questions? Contact the venue</CardTitle>
              <p className="text-xs text-sage-500 mt-1">
                It&rsquo;s completely okay to call ahead to ask questions. Venues are
                usually happy to help.
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {(venue.accessibilityPhone ?? venue.phoneNumber) && (
                <a
                  href={`tel:${venue.accessibilityPhone ?? venue.phoneNumber}`}
                  className="flex items-center gap-3 p-3 bg-sage-50 rounded-xl hover:bg-sage-100 transition-colors focus-calm"
                >
                  <Phone className="w-4 h-4 text-sage-600" />
                  <div>
                    <p className="text-xs text-sage-500">
                      {venue.accessibilityPhone ? "Accessibility enquiries" : "General phone"}
                    </p>
                    <p className="text-sm font-semibold text-sage-800">
                      {venue.accessibilityPhone ?? venue.phoneNumber}
                    </p>
                  </div>
                </a>
              )}
              {(venue.accessibilityEmail ?? venue.email) && (
                <a
                  href={`mailto:${venue.accessibilityEmail ?? venue.email}`}
                  className="flex items-center gap-3 p-3 bg-sage-50 rounded-xl hover:bg-sage-100 transition-colors focus-calm"
                >
                  <Mail className="w-4 h-4 text-sage-600" />
                  <div>
                    <p className="text-xs text-sage-500">Email</p>
                    <p className="text-sm font-semibold text-sage-800">
                      {venue.accessibilityEmail ?? venue.email}
                    </p>
                  </div>
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Affirmations — after */}
        {draftItinerary.affirmations.some((a) => a.timing === "after") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🌟 Afterwards</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <AffirmationCard
                affirmations={draftItinerary.affirmations}
                timing="after"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Download prompt */}
      <div className="mt-8 bg-lavender-50 rounded-2xl border border-lavender-100 p-5 text-center no-print">
        <p className="text-sm text-lavender-700 mb-3">
          Save this guide to read offline on the day — even without internet.
        </p>
        <Button
          variant="calm"
          size="sm"
          onClick={() => handlePrint()}
          className="gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          Download as PDF
        </Button>
      </div>
    </div>
  );
}
