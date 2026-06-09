"use client";

import ItineraryView from "@/components/itinerary/itinerary-view";
import type { Itinerary } from "@/types/itinerary";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ItineraryPage() {
  const params = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState("");
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [canManageCollaborators, setCanManageCollaborators] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    const load = async () => {
      try {
        const stored = sessionStorage.getItem(`pathwise_itinerary_${params.id}`);
        if (stored) {
          setItinerary(JSON.parse(stored) as Itinerary);
        }

        const res = await fetch(`/api/guides/${params.id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setItinerary(data.itinerary as Itinerary);
          setCanEdit(Boolean(data.permissions?.canEdit ?? true));
          setCanManageCollaborators(Boolean(data.permissions?.canManageCollaborators ?? true));
          sessionStorage.setItem(
            `pathwise_itinerary_${params.id}`,
            JSON.stringify(data.itinerary)
          );
          return;
        }

        if (res.status === 401) {
          setRequiresSignIn(true);
          setError(stored ? "" : "This saved guide requires sign-in. Open My Guides to log in.");
          return;
        }

        setError("Guide not found. It may have expired — please generate a new one.");
      } catch {
        setError("Failed to load your guide.");
      }
    };

    load();
  }, [params.id]);

  if (error && !(requiresSignIn && itinerary)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-sage-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sage-700 mb-4">{error}</p>
          <div className="flex flex-col gap-2">
            {requiresSignIn && (
              <Link
                href="/guides"
                className="inline-flex items-center justify-center rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sage-700"
              >
                Open My Guides (log in)
              </Link>
            )}
            <Link
              href="/plan"
              className="inline-flex items-center justify-center rounded-xl border border-sage-200 px-4 py-2.5 text-sm font-medium text-sage-700 hover:bg-sage-50"
            >
              Create a new guide
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-sage-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-sage-100 px-4 h-14 flex items-center justify-between no-print">
        <Link href="/plan" className="flex items-center gap-2 text-sage-700 text-sm hover:text-sage-900 focus-calm">
          <ArrowLeft className="w-4 h-4" />
          New guide
        </Link>
        <div className="flex items-center gap-2 font-semibold text-sage-800">
          <div className="w-6 h-6 bg-sage-500 rounded-md flex items-center justify-center">
            <MapPin className="w-3 h-3 text-white" />
          </div>
          Pathwise
        </div>
        <div className="w-20" />
      </nav>

      {requiresSignIn && itinerary && (
        <div className="no-print border-b border-warm-100 bg-warm-50 px-4 py-3">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-warm-800">
              You’re viewing the local copy on this device. Sign in to sync edits and reopen cloud-saved guides.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/guides"
                className="inline-flex items-center justify-center rounded-xl bg-sage-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700"
              >
                Open My Guides
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-xl border border-warm-200 px-4 py-2 text-sm font-medium text-warm-800 hover:bg-warm-100"
              >
                Use test login
              </Link>
            </div>
          </div>
        </div>
      )}

      <ItineraryView
        itinerary={itinerary}
        allowEditing={canEdit}
        canManageCollaborators={canManageCollaborators}
      />
    </div>
  );
}
