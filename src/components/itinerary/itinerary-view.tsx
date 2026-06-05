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
    Mail,
    MapPin,
    Phone,
    Printer,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import AffirmationCard from "./affirmation-card";
import OverwhelmedPlan from "./overwhelmed-plan";
import PackingList from "./packing-list";
import RiskAssessment from "./risk-assessment";
import TransportSection from "./transport-section";
import VenueMap from "./venue-map";
import WeatherCard from "./weather-card";

interface ItineraryViewProps {
  itinerary: Itinerary;
}

function SectionCard({
  section,
}: {
  section: Itinerary["sections"][0];
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
        </CardContent>
      )}
    </Card>
  );
}

export default function ItineraryView({ itinerary }: ItineraryViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const venue = itinerary.venueData;
  const weatherPackingTips = itinerary.weather
    ? getWeatherPackingTips(itinerary.weather as unknown as WeatherDay)
    : [];

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
          </div>
          <div className="flex gap-2 flex-wrap no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
            {itinerary.venueData && (
              <Link href={`/social-story/${itinerary.id}`}>
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
      {itinerary.affirmations.some((a) => a.timing === "before") && (
        <div className="mb-6">
          <AffirmationCard affirmations={itinerary.affirmations} timing="before" />
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
        {itinerary.sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}

        {/* Weather */}
        {itinerary.weather && (
          <WeatherCard
            weather={itinerary.weather}
            packingTips={weatherPackingTips}
          />
        )}

        {/* Transport */}
        {itinerary.transportTo && (
          <TransportSection
            plan={itinerary.transportTo}
            direction="to"
            venueName={venue.name}
          />
        )}
        {itinerary.transportFrom && (
          <TransportSection
            plan={itinerary.transportFrom}
            direction="from"
            venueName={venue.name}
          />
        )}

        {/* If overwhelmed */}
        <OverwhelmedPlan plan={itinerary.crisisPlan} />

        {/* Affirmations — during */}
        {itinerary.affirmations.some((a) => a.timing === "during") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💛 While you&rsquo;re there</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <AffirmationCard
                affirmations={itinerary.affirmations}
                timing="during"
              />
            </CardContent>
          </Card>
        )}

        {/* Packing list */}
        <PackingList items={itinerary.packingList} />

        {/* Risk assessment */}
        <RiskAssessment
          score={itinerary.riskScore}
          summary={itinerary.riskSummary}
          details={itinerary.riskDetails}
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
        {itinerary.affirmations.some((a) => a.timing === "after") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🌟 Afterwards</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <AffirmationCard
                affirmations={itinerary.affirmations}
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
