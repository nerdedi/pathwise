"use client";

import { Button } from "@/components/ui/button";
import type { SocialStoryPanel } from "@/types/itinerary";
import { ArrowLeft, Heart, Printer } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

interface SocialStoryViewerProps {
  panels: SocialStoryPanel[];
  venueName: string;
  itineraryId: string;
}

const EMOTION_COLORS: Record<NonNullable<SocialStoryPanel["emotion"]>, string> = {
  calm: "bg-sage-50 border-sage-200",
  curious: "bg-calm-50 border-calm-200",
  happy: "bg-warm-50 border-warm-200",
  uncertain: "bg-lavender-50 border-lavender-200",
  proud: "bg-pink-50 border-pink-200",
};

const EMOTION_EMOJIS: Record<NonNullable<SocialStoryPanel["emotion"]>, string> = {
  calm: "😌",
  curious: "🤔",
  happy: "😊",
  uncertain: "😐",
  proud: "🌟",
};

export default function SocialStoryViewer({
  panels,
  venueName,
  itineraryId,
}: SocialStoryViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  return (
    <div className="min-h-screen bg-gradient-to-b from-lavender-50 to-white">
      {/* Nav */}
      <nav className="bg-white border-b border-lavender-100 px-4 h-14 flex items-center justify-between no-print">
        <Link
          href={`/plan/${itineraryId}`}
          className="flex items-center gap-2 text-sage-700 text-sm hover:text-sage-900 focus-calm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to guide
        </Link>
        <Button variant="outline" size="sm" onClick={() => handlePrint()} className="gap-1.5">
          <Printer className="w-3.5 h-3.5" />
          Print social story
        </Button>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8 no-print">
          <div className="inline-flex items-center gap-2 bg-lavender-100 text-lavender-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Heart className="w-3.5 h-3.5" />
            Visual Social Story
          </div>
          <h1 className="text-3xl font-bold text-sage-900 mb-2">
            My visit to {venueName}
          </h1>
          <p className="text-sage-600 text-sm">
            Read this before your visit. You can print it out and take it with
            you.
          </p>
        </div>

        {/* Printable story */}
        <div ref={printRef}>
          {/* Print header */}
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-2xl font-bold">My visit to {venueName}</h1>
            <p className="text-sm text-gray-500 mt-1">Made with Pathwise</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {panels.map((panel) => {
              const emotionKey = panel.emotion ?? "calm";
              const colorClass = EMOTION_COLORS[emotionKey];
              const emoji = EMOTION_EMOJIS[emotionKey];

              return (
                <div
                  key={panel.sequence}
                  className={`rounded-2xl border-2 p-5 ${colorClass} print-page-break-avoid`}
                >
                  {/* Panel number */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-sage-500 bg-white rounded-full w-6 h-6 flex items-center justify-center border border-sage-200">
                      {panel.sequence}
                    </span>
                    <span className="text-xl">{emoji}</span>
                  </div>

                  {/* Image placeholder (shows imagePrompt as description for now) */}
                  {panel.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={panel.imageUrl}
                      alt={panel.title}
                      className="w-full aspect-video object-cover rounded-xl mb-3 bg-sage-100"
                    />
                  ) : (
                    <div className="w-full aspect-video rounded-xl mb-3 bg-white/60 border border-current/10 flex items-center justify-center">
                      <p className="text-xs text-center text-sage-400 px-4 italic">
                        {panel.imagePrompt ?? "Illustration"}
                      </p>
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="font-bold text-sage-900 text-base mb-2">
                    {panel.title}
                  </h3>

                  {/* Text — large, clear */}
                  <p className="text-sage-800 leading-relaxed text-base">
                    {panel.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Print footer */}
          <div className="hidden print:block mt-8 text-center text-xs text-gray-400 border-t pt-4">
            Created with Pathwise — pathwise.app
          </div>
        </div>
      </div>
    </div>
  );
}
