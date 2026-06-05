"use client";

import type { Facility, VenueLocation } from "@/types/venue";
import { useEffect, useRef } from "react";

interface VenueMapProps {
  center: VenueLocation;
  facilities: Facility[];
  venueName: string;
}

const FACILITY_ICONS: Record<string, { emoji: string; color: string }> = {
  toilet: { emoji: "🚻", color: "#3f8a43" },
  "accessible-toilet": { emoji: "♿", color: "#0ea5e9" },
  "gender-neutral-toilet": { emoji: "🚾", color: "#8b5cf6" },
  "quiet-room": { emoji: "🤫", color: "#8b5cf6" },
  "help-desk": { emoji: "ℹ️", color: "#0ea5e9" },
  cafeteria: { emoji: "☕", color: "#f59e0b" },
  lift: { emoji: "🛗", color: "#6d28d9" },
  stairs: { emoji: "🪜", color: "#374151" },
  entrance: { emoji: "🚪", color: "#3f8a43" },
  exit: { emoji: "🚪", color: "#ef4444" },
  "first-aid": { emoji: "🏥", color: "#ef4444" },
  parking: { emoji: "🅿️", color: "#374151" },
  "drop-off": { emoji: "🚌", color: "#f59e0b" },
  "accessible-parking": { emoji: "♿🅿️", color: "#0ea5e9" },
  "prayer-room": { emoji: "🕌", color: "#8b5cf6" },
  "baby-change": { emoji: "👶", color: "#ec4899" },
  "water-fountain": { emoji: "💧", color: "#0ea5e9" },
  seating: { emoji: "🪑", color: "#374151" },
};

export default function VenueMap({ center, facilities, venueName }: VenueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    // Dynamically import mapbox-gl to avoid SSR issues
    let map: mapboxgl.Map;

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      // @ts-expect-error -- CSS module import, no type declarations needed
      await import("mapbox-gl/dist/mapbox-gl.css");

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token || !mapContainerRef.current) return;

      mapboxgl.accessToken = token;

      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [center.lng, center.lat],
        zoom: 16,
      });

      mapRef.current = map;

      // Venue centre marker
      new mapboxgl.Marker({ color: "#3f8a43" })
        .setLngLat([center.lng, center.lat])
        .setPopup(new mapboxgl.Popup().setText(venueName))
        .addTo(map);

      // Add facility markers (those with coordinates)
      facilities
        .filter((f) => f.location)
        .forEach((facility) => {
          const icon = FACILITY_ICONS[facility.type] ?? { emoji: "📍", color: "#374151" };

          const el = document.createElement("div");
          el.className = "facility-marker";
          el.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: white;
            border: 2px solid ${icon.color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          `;
          el.textContent = icon.emoji;
          el.setAttribute("aria-label", facility.label);
          el.setAttribute("role", "button");
          el.setAttribute("tabindex", "0");

          new mapboxgl.Marker({ element: el })
            .setLngLat([facility.location!.lng, facility.location!.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 20 }).setHTML(
                `<strong>${facility.label}</strong>${facility.description ? `<br/><span style="font-size:12px">${facility.description}</span>` : ""}${facility.floor ? `<br/><span style="font-size:11px;color:#666">Floor: ${facility.floor}</span>` : ""}`
              )
            )
            .addTo(map);
        });

      // Navigation controls
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.addControl(
        new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
        "top-right"
      );
    }

    initMap();

    return () => {
      map?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  // Facilities that don't have precise coordinates — list them below map
  const listedFacilities = facilities.filter((f) => !f.location);

  return (
    <div>
      <div ref={mapContainerRef} className="mapbox-container" aria-label={`Map of ${venueName}`} />

      {listedFacilities.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {listedFacilities.map((facility) => {
            const icon = FACILITY_ICONS[facility.type] ?? { emoji: "📍", color: "#374151" };
            return (
              <div
                key={facility.id}
                className="flex items-start gap-2 p-2.5 bg-sage-50 rounded-lg border border-sage-100 text-xs"
              >
                <span className="text-base shrink-0">{icon.emoji}</span>
                <div>
                  <p className="font-medium text-sage-800">{facility.label}</p>
                  {facility.floor && (
                    <p className="text-sage-500">Floor: {facility.floor}</p>
                  )}
                  {facility.description && (
                    <p className="text-sage-500">{facility.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["toilet", "Toilets"],
            ["accessible-toilet", "Accessible toilet"],
            ["gender-neutral-toilet", "Gender-neutral toilet"],
            ["quiet-room", "Quiet room"],
            ["exit", "Exit"],
            ["help-desk", "Help desk"],
            ["cafeteria", "Café"],
            ["lift", "Lift"],
          ] as const
        ).map(([type, label]) => {
          const icon = FACILITY_ICONS[type];
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1 text-xs bg-white border border-sage-100 rounded-full px-2 py-0.5"
            >
              <span>{icon.emoji}</span>
              <span className="text-sage-600">{label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
