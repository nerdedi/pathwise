"use client";

import ItineraryView from "@/components/itinerary/itinerary-view";
import type { Itinerary } from "@/types/itinerary";
import { Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SharedGuidePage() {
  const params = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/public-guides/${params.id}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Guide not found");
        }

        const data = await res.json();
        setItinerary(data.itinerary as Itinerary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load public guide.");
      }
    };

    load();
  }, [params.id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-sage-700 mb-3">{error}</p>
          <Link href="/" className="text-sm text-sage-600 underline">
            Go home
          </Link>
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
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-sage-100 px-4 h-14 flex items-center justify-between no-print">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sage-800">
          <div className="w-6 h-6 bg-sage-500 rounded-md flex items-center justify-center">
            <MapPin className="w-3 h-3 text-white" />
          </div>
          Pathwise
        </Link>
        <p className="text-xs text-sage-500">Shared guide</p>
      </nav>

      <ItineraryView itinerary={itinerary} allowEditing={false} />
    </div>
  );
}
