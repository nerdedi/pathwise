"use client";

import SocialStoryViewer from "@/components/social-story/social-story-viewer";
import type { Itinerary } from "@/types/itinerary";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SocialStoryPage() {
  const params = useParams<{ id: string }>();
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
          setError("This social story requires sign-in. Open My Guides to log in.");
          return;
        }

        setError("Social story not found. Please generate a new guide first.");
      } catch {
        setError("Failed to load social story.");
      }
    };

    load();
  }, [params.id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <p className="text-sage-700">{error}</p>
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
    <SocialStoryViewer
      panels={itinerary.socialStory}
      venueName={itinerary.venueData.name}
      itineraryId={itinerary.id}
    />
  );
}
