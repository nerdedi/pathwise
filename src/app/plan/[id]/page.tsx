"use client";

import ItineraryView from "@/components/itinerary/itinerary-view";
import type { Itinerary } from "@/types/itinerary";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ItineraryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;

    const load = async () => {
      try {
        const stored = sessionStorage.getItem(`pathwise_itinerary_${params.id}`);
        if (stored) {
          setItinerary(JSON.parse(stored) as Itinerary);
          return;
        }

        const res = await fetch(`/api/guides/${params.id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setItinerary(data.itinerary as Itinerary);
          sessionStorage.setItem(
            `pathwise_itinerary_${params.id}`,
            JSON.stringify(data.itinerary)
          );
          return;
        }

        if (res.status === 401) {
          setError("This saved guide requires sign-in. Open My Guides to log in.");
          return;
        }

        setError("Guide not found. It may have expired — please generate a new one.");
      } catch {
        setError("Failed to load your guide.");
      }
    };

    load();
  }, [params.id]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-sage-700 mb-4">{error}</p>
        <Link
          href="/plan"
          className="text-sage-600 underline text-sm"
        >
          Create a new guide
        </Link>
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

      <ItineraryView itinerary={itinerary} />
    </div>
  );
}
