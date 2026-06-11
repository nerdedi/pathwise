"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    normalizeCollaborators,
    normalizeLockedSectionIds,
} from "@/lib/collaboration";
import type { WeatherDay } from "@/lib/weather";
import { getWeatherPackingTips } from "@/lib/weather";
import type { CollaborationRole, Itinerary } from "@/types/itinerary";
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
    ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import AffirmationCard from "./affirmation-card";
import FoodOptions from "./food-options";
import LiveTripDashboard from "./live-trip-dashboard";
import MoodCheckin from "./mood-checkin";
import OverwhelmedPlan from "./overwhelmed-plan";
import PackingList from "./packing-list";
import RiskAssessment from "./risk-assessment";
import SafetySummary from "./safety-summary";
import SupportToolkit from "./support-toolkit";
import TransportSection from "./transport-section";
import VenueMap from "./venue-map";
import WeatherCard from "./weather-card";

interface ItineraryViewProps {
  itinerary: Itinerary;
  allowEditing?: boolean;
  canManageCollaborators?: boolean;
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
  readOnlyReason,
  lockable,
  locked,
  onToggleLock,
  onUpdate,
  onRegenerate,
  regenerating,
  onSelect,
  mapLinked,
}: {
  section: Itinerary["sections"][0];
  editable?: boolean;
  readOnlyReason?: string;
  lockable?: boolean;
  locked?: boolean;
  onToggleLock?: (locked: boolean) => void;
  onUpdate?: (patch: Partial<Itinerary["sections"][0]>) => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
  onSelect?: () => void;
  mapLinked?: boolean;
}) {
  const [open, setOpen] = useState(!section.isExpandable);

  return (
    <Card>
      <button
        onClick={() => {
          onSelect?.();
          section.isExpandable && setOpen((o) => !o);
        }}
        className="w-full text-left focus-calm"
        aria-expanded={open}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <span className="text-xl">{section.emoji}</span>
              {section.title}
              {mapLinked && (
                <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-medium text-sage-700">
                  Showing on map
                </span>
              )}
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
          {lockable && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-sage-100 bg-sage-50 px-3 py-2">
              <p className="text-xs text-sage-600">Lock this section for collaborators</p>
              <label className="inline-flex items-center gap-2 text-xs text-sage-700">
                <input
                  type="checkbox"
                  checked={Boolean(locked)}
                  onChange={(e) => onToggleLock?.(e.target.checked)}
                />
                Locked
              </label>
            </div>
          )}

          {readOnlyReason && (
            <p className="mb-3 text-xs text-warm-700 bg-warm-50 border border-warm-200 rounded-lg px-3 py-2">
              {readOnlyReason}
            </p>
          )}

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

export default function ItineraryView({
  itinerary,
  allowEditing = true,
  canManageCollaborators = allowEditing,
}: ItineraryViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });
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
  const [votingCommunityEntryId, setVotingCommunityEntryId] = useState<string | null>(null);
  const [votedCommunityEntryIds, setVotedCommunityEntryIds] = useState<string[]>([]);
  const [reportingCommunityEntryId, setReportingCommunityEntryId] = useState<string | null>(null);
  const [reportedCommunityEntryIds, setReportedCommunityEntryIds] = useState<string[]>([]);
  const [refreshingLiveReports, setRefreshingLiveReports] = useState(false);
  const [transportOrigin, setTransportOrigin] = useState(itinerary.fromSuburb ?? "");
  const [transportDate, setTransportDate] = useState(itinerary.visitDate ?? "");
  const [transportTime, setTransportTime] = useState("10:00");
  const [generatingTransport, setGeneratingTransport] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<CollaborationRole>("viewer");
  const [privateNotesDraft, setPrivateNotesDraft] = useState(itinerary.privateNotes ?? "");
  const [activeMapSectionId, setActiveMapSectionId] = useState<string | null>(
    itinerary.sections[0]?.id ?? null
  );

  const venue = draftItinerary.venueData;
  const collaborators = normalizeCollaborators(draftItinerary);
  const lockedSectionIds = normalizeLockedSectionIds(draftItinerary.lockedSectionIds);
  const weatherPackingTips = draftItinerary.weather
    ? getWeatherPackingTips(draftItinerary.weather as unknown as WeatherDay)
    : [];
  const liveUpdates = venue.liveUpdates ?? [];
  const reviewHighlights = venue.externalInsights?.reviewHighlights ?? [];
  const estimatedFieldCount = venue.sourceMeta?.estimatedFieldPaths?.length ?? 0;
  const communityVotesKey = `pathwise_community_votes_${draftItinerary.id}`;
  const communityReportsKey = `pathwise_community_reports_${draftItinerary.id}`;

  useEffect(() => {
    setDraftItinerary(itinerary);
    setPrivateNotesDraft(itinerary.privateNotes ?? "");
    setActiveMapSectionId(itinerary.sections[0]?.id ?? null);
    setTransportOrigin(itinerary.fromSuburb ?? "");
    setTransportDate(itinerary.visitDate ?? "");
  }, [itinerary]);

  useEffect(() => {
    if (!canManageCollaborators) return;
    setDraftItinerary((prev) => ({
      ...prev,
      privateNotes: privateNotesDraft,
    }));
  }, [privateNotesDraft, canManageCollaborators]);

  const updateSection = (sectionId: string, patch: Partial<Itinerary["sections"][0]>) => {
    setDraftItinerary((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    }));
  };

  const toggleSectionLock = (sectionId: string, locked: boolean) => {
    setDraftItinerary((prev) => {
      const current = new Set(normalizeLockedSectionIds(prev.lockedSectionIds));
      if (locked) {
        current.add(sectionId);
      } else {
        current.delete(sectionId);
      }

      return {
        ...prev,
        lockedSectionIds: Array.from(current),
      };
    });
  };

  const persistItinerary = async (nextItinerary: Itinerary, successMessage = "Saved to your account.") => {
    const normalizedCollaborators = normalizeCollaborators(nextItinerary);
    const normalizedItinerary: Itinerary = {
      ...nextItinerary,
      sharedWith: normalizedCollaborators,
      sharedWithEmails: normalizedCollaborators.map((item) => item.email),
      lockedSectionIds: normalizeLockedSectionIds(nextItinerary.lockedSectionIds),
      privateNotes: canManageCollaborators ? privateNotesDraft : undefined,
    };

    sessionStorage.setItem(
      `pathwise_itinerary_${normalizedItinerary.id}`,
      JSON.stringify(normalizedItinerary)
    );

    try {
      const res = await fetch(`/api/guides/${normalizedItinerary.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: normalizedItinerary }),
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

    if (collaborators.some((item) => item.email === email)) {
      setSaveMessage("That email already has access.");
      return;
    }

    setDraftItinerary((prev) => ({
      ...prev,
      sharedWith: [...normalizeCollaborators(prev), { email, role: shareRole }],
      sharedWithEmails: [...normalizeCollaborators(prev).map((item) => item.email), email],
    }));
    setShareEmail("");
    setShareRole("viewer");
    setSaveMessage("Collaborator added. Save changes to sync.");
  };

  const updateSharedRole = (email: string, role: CollaborationRole) => {
    setDraftItinerary((prev) => {
      const updated = normalizeCollaborators(prev).map((item) =>
        item.email === email ? { ...item, role } : item
      );
      return {
        ...prev,
        sharedWith: updated,
        sharedWithEmails: updated.map((item) => item.email),
      };
    });
    setSaveMessage("Collaborator role updated. Save changes to sync.");
  };

  const removeSharedEmail = (email: string) => {
    setDraftItinerary((prev) => ({
      ...prev,
      sharedWith: normalizeCollaborators(prev).filter((item) => item.email !== email),
      sharedWithEmails: normalizeCollaborators(prev)
        .filter((item) => item.email !== email)
        .map((item) => item.email),
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

  const refreshLiveReports = async () => {
    setRefreshingLiveReports(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: venue.url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to sync live reports");
      }

      const data = await res.json();
      const nextVenue = {
        ...draftItinerary.venueData,
        liveUpdates:
          (data.venueData?.liveUpdates as string[] | undefined) ??
          draftItinerary.venueData.liveUpdates,
        externalInsights:
          (data.venueData?.externalInsights as Itinerary["venueData"]["externalInsights"]) ??
          draftItinerary.venueData.externalInsights,
        sourceMeta: {
          ...(draftItinerary.venueData.sourceMeta ?? {}),
          ...((data.venueData?.sourceMeta as Itinerary["venueData"]["sourceMeta"]) ?? {}),
          liveUpdatesSyncedAt: new Date().toISOString(),
        },
      };

      const nextItinerary = {
        ...draftItinerary,
        venueData: nextVenue,
      };

      setDraftItinerary(nextItinerary);
      await persistItinerary(nextItinerary, "Live venue updates synced.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to sync live reports.");
    } finally {
      setRefreshingLiveReports(false);
    }
  };

  const generateTransportPlan = async () => {
    if (!transportOrigin.trim()) {
      setSaveMessage("Add your starting suburb to generate transport guidance.");
      return;
    }

    setGeneratingTransport(true);
    try {
      const res = await fetch("/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: transportOrigin,
          to: `${venue.address}, ${venue.suburb}`,
          date: transportDate || undefined,
          time: transportTime,
          routePreference: draftItinerary.sensoryProfile.routePreference,
          wheelchairRequired:
            draftItinerary.sensoryProfile.needsMobilityAccess ||
            draftItinerary.sensoryProfile.usesMobilityAid,
          needsLevelBoardingInfo: draftItinerary.sensoryProfile.needsLevelBoardingInfo,
          needsLiveLiftInfo: draftItinerary.sensoryProfile.needsLiveLiftInfo,
          needsOnboardToiletInfo: draftItinerary.sensoryProfile.hasMedicalNeeds,
          crowdSensitivity: draftItinerary.sensoryProfile.crowdSensitivity,
          soundSensitivity: draftItinerary.sensoryProfile.soundSensitivity,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate transport plan");
      }

      const nextItinerary = {
        ...draftItinerary,
        fromSuburb: transportOrigin,
        visitDate: transportDate || draftItinerary.visitDate,
        transportTo: data.plan,
      };

      setDraftItinerary(nextItinerary);
      await persistItinerary(nextItinerary, "Transport trip plan generated.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to generate transport plan.");
    } finally {
      setGeneratingTransport(false);
    }
  };

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(communityVotesKey);
    if (!stored) return;

    try {
      const ids = JSON.parse(stored) as string[];
      setVotedCommunityEntryIds(Array.isArray(ids) ? ids : []);
    } catch {
      setVotedCommunityEntryIds([]);
    }
  }, [communityVotesKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(communityReportsKey);
    if (!stored) return;

    try {
      const ids = JSON.parse(stored) as string[];
      setReportedCommunityEntryIds(Array.isArray(ids) ? ids : []);
    } catch {
      setReportedCommunityEntryIds([]);
    }
  }, [communityReportsKey]);

  const markCommunityHelpful = async (entryId: string) => {
    if (votedCommunityEntryIds.includes(entryId)) {
      setSaveMessage("You already marked this note as helpful.");
      return;
    }

    setVotingCommunityEntryId(entryId);
    try {
      const res = await fetch("/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to register helpful vote");
      }

      setCommunityEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, helpful_count: Number(data.helpfulCount ?? (entry.helpful_count ?? 0)) }
            : entry
        )
      );

      const nextVotes = [...votedCommunityEntryIds, entryId];
      setVotedCommunityEntryIds(nextVotes);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(communityVotesKey, JSON.stringify(nextVotes));
      }

      setSaveMessage("Thanks — your feedback was recorded.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to register helpful vote.");
    } finally {
      setVotingCommunityEntryId(null);
    }
  };

  const reportCommunityEntry = async (entryId: string) => {
    if (reportedCommunityEntryIds.includes(entryId)) {
      setSaveMessage("You already reported this note.");
      return;
    }

    setReportingCommunityEntryId(entryId);
    try {
      const res = await fetch("/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          action: "report",
          reason: "Flagged by user from itinerary view",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to report note");
      }

      const nextReports = [...reportedCommunityEntryIds, entryId];
      setReportedCommunityEntryIds(nextReports);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(communityReportsKey, JSON.stringify(nextReports));
      }

      setSaveMessage("Thanks — the note has been flagged for review.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to report note.");
    } finally {
      setReportingCommunityEntryId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 print-root print-safe">
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
            {!allowEditing && (
              <p className="text-xs text-sage-500 mt-1">
                Read-only access: ask the guide owner for edit permissions.
              </p>
            )}
            {draftItinerary.lastEditedAt && (
              <p className="text-xs text-sage-500 mt-1">
                Last updated {new Date(draftItinerary.lastEditedAt).toLocaleString()}
                {draftItinerary.lastEditedByEmail ? ` by ${draftItinerary.lastEditedByEmail}` : ""}
              </p>
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
        <SafetySummary
          riskSummary={draftItinerary.riskSummary}
          venueRiskFactors={venue.riskFactors}
          emergencyExits={venue.emergencyExits}
        />

        <MoodCheckin
          itineraryId={draftItinerary.id}
          profile={draftItinerary.sensoryProfile}
          crisisPlan={draftItinerary.crisisPlan}
        />

        <LiveTripDashboard
          venueName={venue.name}
          quietTimes={venue.quietTimes}
          peakTimes={venue.peakTimes}
          enableVoice={draftItinerary.sensoryProfile.wantsTextToSpeech}
        />

        {(liveUpdates.length > 0 || reviewHighlights.length > 0 || venue.externalInsights?.averageRating) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📣 Live updates and practical tips</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-sage-100 text-sage-700 rounded-full px-2.5 py-1">
                  Site pages scanned: {venue.sourceMeta?.sitePagesScanned ?? "n/a"}
                </span>
                {venue.sourceMeta?.hasGoogleInsights && (
                  <span className="text-xs bg-calm-100 text-calm-700 rounded-full px-2.5 py-1">
                    Includes maps insights
                  </span>
                )}
                {estimatedFieldCount > 0 && (
                  <span className="text-xs bg-warm-100 text-warm-700 rounded-full px-2.5 py-1">
                    {estimatedFieldCount} field(s) estimated
                  </span>
                )}
                {!venue.sourceMeta?.hasGoogleInsights && (
                  <span className="text-xs bg-warm-100 text-warm-700 rounded-full px-2.5 py-1">
                    Google reviews not found yet
                  </span>
                )}
              </div>

              {venue.sourceMeta?.googleQueriesTried && venue.sourceMeta.googleQueriesTried.length > 0 && (
                <p className="text-xs text-sage-500">
                  Google queries tried: {venue.sourceMeta.googleQueriesTried.join(" • ")}
                </p>
              )}

              {venue.sourceMeta?.liveUpdatesSyncedAt && (
                <p className="text-xs text-sage-500">
                  Last synced: {new Date(venue.sourceMeta.liveUpdatesSyncedAt).toLocaleString()}
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    void refreshLiveReports();
                  }}
                  disabled={refreshingLiveReports}
                >
                  {refreshingLiveReports ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Sync live venue reports
                </Button>
              </div>

              {typeof venue.externalInsights?.averageRating === "number" && (
                <p className="text-sm text-sage-700">
                  Community signal: {venue.externalInsights.averageRating.toFixed(1)}/5
                  {typeof venue.externalInsights.totalRatings === "number"
                    ? ` (${venue.externalInsights.totalRatings.toLocaleString()} ratings)`
                    : ""}
                </p>
              )}

              {liveUpdates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-warm-700 mb-1">From the venue site</p>
                  <ul className="space-y-1.5">
                    {liveUpdates.map((update) => (
                      <li key={update} className="text-sm text-sage-700 flex gap-2">
                        <span className="text-sage-400 mt-0.5">•</span>
                        <span>{update}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reviewHighlights.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-calm-700 mb-1">Visitor-reported details</p>
                  <ul className="space-y-1.5">
                    {reviewHighlights.slice(0, 5).map((tip) => (
                      <li key={tip} className="text-sm text-sage-700 flex gap-2">
                        <span className="text-sage-400 mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                selectedSectionId={activeMapSectionId}
                sensoryProfile={draftItinerary.sensoryProfile}
              />
            </CardContent>
          </Card>
        )}

        {/* Itinerary sections */}
        {draftItinerary.sections.map((section) => {
          const isLockedForCollaborator =
            !canManageCollaborators && lockedSectionIds.includes(section.id);

          return (
            <div key={section.id} className="space-y-5">
              <SectionCard
                section={section}
                editable={allowEditing && editMode && !isLockedForCollaborator}
                readOnlyReason={
                  isLockedForCollaborator
                    ? "This section is locked by the guide owner."
                    : undefined
                }
                lockable={allowEditing && editMode && canManageCollaborators}
                locked={lockedSectionIds.includes(section.id)}
                onToggleLock={(locked) => toggleSectionLock(section.id, locked)}
                onUpdate={(patch) => updateSection(section.id, patch)}
                onRegenerate={() => regenerateSection(section.id)}
                onSelect={() => setActiveMapSectionId(section.id)}
                mapLinked={activeMapSectionId === section.id}
                regenerating={
                  allowEditing &&
                  regeneratingSectionId === section.id &&
                  !isLockedForCollaborator
                }
              />
              {section.id === "eating-drinking" && venue.cafeterias.length > 0 && (
                <FoodOptions cafeterias={venue.cafeterias} />
              )}
            </div>
          );
        })}

        {!draftItinerary.sections.some((section) => section.id === "eating-drinking") &&
          venue.cafeterias.length > 0 && <FoodOptions cafeterias={venue.cafeterias} />}

        {canManageCollaborators && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🤝 Shared planning</CardTitle>
              <p className="text-xs text-sage-500 mt-1">
                Share this plan with assistants or trusted people so you can coordinate together.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {collaborators.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {collaborators.map((collaborator) => (
                    <span
                      key={collaborator.email}
                      className="inline-flex items-center gap-2 rounded-full bg-sage-50 border border-sage-200 px-3 py-1 text-xs text-sage-700"
                    >
                      {collaborator.email}
                      <select
                        value={collaborator.role}
                        onChange={(e) =>
                          updateSharedRole(
                            collaborator.email,
                            e.target.value === "viewer" ? "viewer" : "editor"
                          )
                        }
                        className="h-6 rounded-md border border-sage-200 bg-white px-1.5 text-[11px] text-sage-600"
                        aria-label={`Role for ${collaborator.email}`}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSharedEmail(collaborator.email)}
                        className="text-sage-500 hover:text-sage-700"
                        aria-label={`Remove ${collaborator.email}`}
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
                <select
                  value={shareRole}
                  onChange={(e) =>
                    setShareRole(e.target.value === "editor" ? "editor" : "viewer")
                  }
                  className="h-10 rounded-xl border border-sage-200 px-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                  aria-label="Collaborator role"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <Button type="button" variant="outline" onClick={addSharedEmail}>
                  Add
                </Button>
              </div>

              <p className="text-xs text-sage-500">
                Viewers can read-only view. Editors can update shared sections. Private notes remain owner-only.
              </p>
            </CardContent>
          </Card>
        )}

        {canManageCollaborators && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🔒 Private notes</CardTitle>
              <p className="text-xs text-sage-500 mt-1">
                These notes are never shown on shared/public guides.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <textarea
                value={privateNotesDraft}
                onChange={(e) => setPrivateNotesDraft(e.target.value)}
                placeholder="Example: Arrive 20 min early. Avoid platform 4 if crowded."
                className="w-full min-h-24 text-sm text-sage-700 border border-sage-200 rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
              />
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
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={
                          votingCommunityEntryId === entry.id ||
                          votedCommunityEntryIds.includes(entry.id)
                        }
                        onClick={() => {
                          void markCommunityHelpful(entry.id);
                        }}
                      >
                        {votingCommunityEntryId === entry.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        )}
                        {votedCommunityEntryIds.includes(entry.id)
                          ? "Helpful recorded"
                          : "Mark helpful"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          reportingCommunityEntryId === entry.id ||
                          reportedCommunityEntryIds.includes(entry.id)
                        }
                        onClick={() => {
                          void reportCommunityEntry(entry.id);
                        }}
                      >
                        {reportedCommunityEntryIds.includes(entry.id)
                          ? "Reported"
                          : reportingCommunityEntryId === entry.id
                          ? "Reporting…"
                          : "Report note"}
                      </Button>
                      <span className="text-xs text-sage-500">
                        Helpful: {entry.helpful_count ?? 0}
                      </span>
                    </div>
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
            itineraryId={draftItinerary.id}
            plan={draftItinerary.transportTo}
            direction="to"
            venueName={venue.name}
            supportCardName={draftItinerary.sensoryProfile.supportCardName}
            supportCardMessage={draftItinerary.sensoryProfile.supportCardMessage}
            emergencyContacts={draftItinerary.sensoryProfile.emergencyContacts}
            wantsVoiceAssistance={draftItinerary.sensoryProfile.wantsTextToSpeech}
            copingStrategies={draftItinerary.sensoryProfile.copingStrategies}
            groundingTechniques={draftItinerary.sensoryProfile.groundingTechniques}
          />
        )}
        {!draftItinerary.transportTo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🚌 Transport trip planning</CardTitle>
              <p className="text-xs text-sage-500 mt-1">
                Add your starting suburb to generate a detailed route with stop prompts.
              </p>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  value={transportOrigin}
                  onChange={(e) => setTransportOrigin(e.target.value)}
                  placeholder="Starting suburb"
                  className="h-10 rounded-xl border border-sage-200 px-3 text-sm"
                />
                <input
                  type="date"
                  value={transportDate}
                  onChange={(e) => setTransportDate(e.target.value)}
                  className="h-10 rounded-xl border border-sage-200 px-3 text-sm"
                />
                <input
                  type="time"
                  value={transportTime}
                  onChange={(e) => setTransportTime(e.target.value)}
                  className="h-10 rounded-xl border border-sage-200 px-3 text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={() => {
                  void generateTransportPlan();
                }}
                disabled={generatingTransport}
                className="gap-2"
              >
                {generatingTransport ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Generate transport trip plan
              </Button>
            </CardContent>
          </Card>
        )}
        {draftItinerary.transportFrom && (
          <TransportSection
            itineraryId={draftItinerary.id}
            plan={draftItinerary.transportFrom}
            direction="from"
            venueName={venue.name}
            supportCardName={draftItinerary.sensoryProfile.supportCardName}
            supportCardMessage={draftItinerary.sensoryProfile.supportCardMessage}
            emergencyContacts={draftItinerary.sensoryProfile.emergencyContacts}
            wantsVoiceAssistance={draftItinerary.sensoryProfile.wantsTextToSpeech}
            copingStrategies={draftItinerary.sensoryProfile.copingStrategies}
            groundingTechniques={draftItinerary.sensoryProfile.groundingTechniques}
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
          venueRiskFactors={venue.riskFactors}
          safetyNotes={venue.safetyNotes}
          emergencyExits={venue.emergencyExits}
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
