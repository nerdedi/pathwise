"use client";

import SocialStoryViewer from "@/components/social-story/social-story-viewer";
import { buildFallbackSocialStoryPanels } from "@/lib/social-story";
import type { Itinerary } from "@/types/itinerary";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SocialStoryPage() {
  const params = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState("");

  const withSocialStoryFallback = (value: Itinerary): Itinerary => {
    if (value.socialStory?.length) return value;

    return {
      ...value,
      socialStory: buildFallbackSocialStoryPanels({
        venueName: value.venueData.name,
        sections: value.sections,
        quietTimes: value.venueData.quietTimes,
        selfCareReminders: value.crisisPlan.selfCareReminders,
      }),
    };
  };

  useEffect(() => {
    if (!params.id) return;

    const load = async () => {
      try {
        const stored = sessionStorage.getItem(`pathwise_itinerary_${params.id}`);
        if (stored) {
          setItinerary(withSocialStoryFallback(JSON.parse(stored) as Itinerary));
          return;
        }

        const res = await fetch(`/api/guides/${params.id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const next = withSocialStoryFallback(data.itinerary as Itinerary);
          setItinerary(next);
          sessionStorage.setItem(
            `pathwise_itinerary_${params.id}`,
            JSON.stringify(next)
          );
          return;
        }

        const publicRes = await fetch(`/api/public-guides/${params.id}`, {
          cache: "no-store",
        });
        if (publicRes.ok) {
          const data = await publicRes.json();
          const next = withSocialStoryFallback(data.itinerary as Itinerary);
          setItinerary(next);
          sessionStorage.setItem(
            `pathwise_itinerary_${params.id}`,
            JSON.stringify(next)
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
      quietTimes={itinerary.venueData.quietTimes}
      supportReminders={itinerary.crisisPlan.selfCareReminders}
    />
  );
}
