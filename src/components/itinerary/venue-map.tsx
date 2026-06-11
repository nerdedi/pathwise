"use client";

import {
    buildRouteSummary,
    getSectionMapConfig,
    sortFacilitiesForMap,
} from "@/lib/venue-map";
import type { SensoryProfile } from "@/types/sensory-profile";
import type { Facility, FacilityType, VenueLocation } from "@/types/venue";
import { useEffect, useMemo, useRef, useState } from "react";

interface VenueMapProps {
  center: VenueLocation;
  facilities: Facility[];
  venueName: string;
  selectedSectionId?: string | null;
  sensoryProfile?: SensoryProfile;
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

const FEATURE_FILTERS: Array<{ id: string; label: string; types: FacilityType[] | null }> = [
  { id: "all", label: "All features", types: null },
  { id: "toilets", label: "Toilets", types: ["toilet", "accessible-toilet", "gender-neutral-toilet", "baby-change"] },
  { id: "quiet", label: "Quiet spaces", types: ["quiet-room", "prayer-room", "seating"] },
  { id: "help", label: "Help & safety", types: ["help-desk", "first-aid", "exit", "entrance"] },
  { id: "food", label: "Food", types: ["cafeteria", "water-fountain"] },
  { id: "access", label: "Access", types: ["lift", "stairs", "accessible-parking", "parking", "drop-off"] },
] as const;

type FeatureFilterId = (typeof FEATURE_FILTERS)[number]["id"];
type MappedFacility = Facility & {
  mapLocation: VenueLocation;
  isApproximateLocation: boolean;
};

export default function VenueMap({
  center,
  facilities,
  venueName,
  selectedSectionId,
  sensoryProfile,
}: VenueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const markerElementsRef = useRef<Record<string, HTMLDivElement>>({});
  const [activeFilter, setActiveFilter] = useState<FeatureFilterId>("all");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    facilities.find((facility) => facility.location)?.id ?? facilities[0]?.id ?? null
  );
  const mapContext = useMemo(() => getSectionMapConfig(selectedSectionId), [selectedSectionId]);

  const filteredFacilities = useMemo(() => {
    const filter = FEATURE_FILTERS.find((entry) => entry.id === activeFilter);
    const filterTypes = filter?.types;
    if (!filterTypes) return facilities;
    return facilities.filter((facility) => filterTypes.includes(facility.type));
  }, [activeFilter, facilities]);

  const rankedFacilities = useMemo(
    () => sortFacilitiesForMap(filteredFacilities, selectedSectionId, sensoryProfile),
    [filteredFacilities, selectedSectionId, sensoryProfile]
  );

  const mappedFacilities = useMemo<MappedFacility[]>(() => {
    const baseLat = center.lat;
    const baseLng = center.lng;
    const cosLat = Math.max(Math.cos((baseLat * Math.PI) / 180), 0.2);

    return rankedFacilities.map((facility, index) => {
      if (facility.location) {
        return {
          ...facility,
          mapLocation: facility.location,
          isApproximateLocation: false,
        };
      }

      const ring = Math.floor(index / 8) + 1;
      const angle = ((index % 8) / 8) * Math.PI * 2;
      const metres = 20 + ring * 14;
      const latOffset = (metres / 111_320) * Math.cos(angle);
      const lngOffset = (metres / (111_320 * cosLat)) * Math.sin(angle);

      return {
        ...facility,
        mapLocation: {
          lat: baseLat + latOffset,
          lng: baseLng + lngOffset,
        },
        isApproximateLocation: true,
      };
    });
  }, [center.lat, center.lng, rankedFacilities]);

  const facilitiesWithLocation = useMemo(
    () => mappedFacilities,
    [mappedFacilities]
  );

  const selectedFacility = useMemo(
    () => rankedFacilities.find((facility) => facility.id === selectedFacilityId) ?? rankedFacilities[0],
    [rankedFacilities, selectedFacilityId]
  );

  const selectedMappedFacility = useMemo(
    () => mappedFacilities.find((facility) => facility.id === selectedFacility?.id) ?? mappedFacilities[0],
    [mappedFacilities, selectedFacility?.id]
  );

  const pathStart = useMemo(
    () =>
      mappedFacilities.find((facility) => facility.type === "entrance")?.mapLocation ??
      facilities.find((facility) => facility.type === "entrance" && facility.location)?.location ??
      facilitiesWithLocation[0]?.mapLocation ??
      center,
    [center, facilities, facilitiesWithLocation, mappedFacilities]
  );

  useEffect(() => {
    const suggestedFilter = mapContext.suggestedFilterId as FeatureFilterId;
    if (suggestedFilter && suggestedFilter !== activeFilter) {
      setActiveFilter(suggestedFilter);
      return;
    }

    if (!selectedFacilityId && rankedFacilities[0]?.id) {
      setSelectedFacilityId(rankedFacilities[0].id);
    }
  }, [activeFilter, mapContext.suggestedFilterId, rankedFacilities, selectedFacilityId]);

  useEffect(() => {
    // Dynamically import mapbox-gl to avoid SSR issues
    let cancelled = false;

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const container = mapContainerRef.current;
      if (!token || !container || cancelled) return;

      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      container.innerHTML = "";

      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [center.lng, center.lat],
        zoom: 16,
      });

      if (cancelled) {
        map.remove();
        return;
      }

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        const bounds = new mapboxgl.LngLatBounds([center.lng, center.lat], [center.lng, center.lat]);
        facilitiesWithLocation.forEach((facility) => {
          bounds.extend([facility.mapLocation.lng, facility.mapLocation.lat]);
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, {
            padding: 60,
            maxZoom: 18,
            duration: 0,
          });
        }

        map.addSource("selected-path", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "selected-path-line",
          type: "line",
          source: "selected-path",
          paint: {
            "line-color": "#3f8a43",
            "line-width": 4,
            "line-dasharray": [2, 1],
            "line-opacity": 0.8,
          },
        });
      });

      // Venue centre marker
      new mapboxgl.Marker({ color: "#3f8a43" })
        .setLngLat([center.lng, center.lat])
        .setPopup(new mapboxgl.Popup().setText(venueName))
        .addTo(map);

      // Add facility markers (those with coordinates)
      markerElementsRef.current = {};

      mappedFacilities.forEach((facility) => {
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
            transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
          `;
          el.textContent = icon.emoji;
          el.setAttribute("aria-label", facility.label);
          el.setAttribute("role", "button");
          el.setAttribute("tabindex", "0");
          el.addEventListener("click", () => setSelectedFacilityId(facility.id));
          markerElementsRef.current[facility.id] = el;

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([facility.mapLocation.lng, facility.mapLocation.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 20 }).setHTML(
                `<strong>${facility.label}</strong>${facility.description ? `<br/><span style="font-size:12px">${facility.description}</span>` : ""}${facility.floor ? `<br/><span style="font-size:11px;color:#666">Floor: ${facility.floor}</span>` : ""}${facility.isApproximateLocation ? `<br/><span style="font-size:11px;color:#666">Approximate map position</span>` : ""}`
              )
            )
            .addTo(map);

          markerRefs.current.push(marker);
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
      cancelled = true;
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = "";
      }
    };
  }, [center.lat, center.lng, facilitiesWithLocation, mappedFacilities, venueName]);

  useEffect(() => {
    Object.entries(markerElementsRef.current).forEach(([facilityId, el]) => {
      const selected = facilityId === selectedFacility?.id;
      el.style.transform = selected ? "scale(1.15)" : "scale(1)";
      el.style.background = selected ? "#ecfdf5" : "white";
      el.style.boxShadow = selected
        ? "0 0 0 4px rgba(63,138,67,0.18), 0 8px 18px rgba(15,23,42,0.18)"
        : "0 2px 8px rgba(0,0,0,0.15)";
    });
  }, [selectedFacility]);

  useEffect(() => {
    const map = mapRef.current;
    const target = selectedMappedFacility?.mapLocation;
    if (!map || !target) return;

    const source = map.getSource("selected-path") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [pathStart.lng, pathStart.lat],
                [target.lng, target.lat],
              ],
            },
            properties: {},
          },
        ],
      });
    }

    map.easeTo({
      center: [target.lng, target.lat],
      duration: 500,
      zoom: Math.max(map.getZoom(), 16.5),
    });
  }, [pathStart.lat, pathStart.lng, selectedMappedFacility]);

  // Facilities that don't have precise coordinates — list them below map
  const listedFacilities = mappedFacilities.filter((f) => f.isApproximateLocation);
  const routeSummary = buildRouteSummary(selectedFacility, venueName, sensoryProfile, selectedSectionId);

  return (
    <div>
      <div ref={mapContainerRef} className="mapbox-container" aria-label={`Map of ${venueName}`} />

      <div className="mt-4 rounded-xl border border-sage-100 bg-sage-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">Map focus</p>
            <h4 className="text-sm font-semibold text-sage-900 mt-1">{mapContext.label}</h4>
          </div>
          <span className="rounded-full bg-white border border-sage-200 px-3 py-1 text-xs font-medium text-sage-700">
            {routeSummary.emphasis}
          </span>
        </div>
        <ol className="mt-3 space-y-1.5">
          {routeSummary.steps.map((step, index) => (
            <li key={`${mapContext.label}-${index}`} className="flex gap-2 text-sm text-sage-700">
              <span className="mt-0.5 text-xs font-semibold text-sage-500">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FEATURE_FILTERS.map((filter) => {
          const selected = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected
                  ? "border-sage-300 bg-sage-100 text-sage-800"
                  : "border-sage-200 bg-white text-sage-600 hover:border-sage-300"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {selectedFacility && (
        <div className="mt-4 rounded-xl border border-sage-100 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">
                Selected feature
              </p>
              <h4 className="text-sm font-semibold text-sage-900 mt-1">{selectedFacility.label}</h4>
              {selectedFacility.floor && (
                <p className="text-xs text-sage-500 mt-1">{selectedFacility.floor}</p>
              )}
            </div>
            <span className="text-lg">
              {(FACILITY_ICONS[selectedFacility.type] ?? { emoji: "📍" }).emoji}
            </span>
          </div>

          {routeSummary.steps.length > 0 && (
            <ol className="mt-3 space-y-1.5">
              {routeSummary.steps.map((step, index) => (
                <li key={`${selectedFacility.id}-${index}`} className="flex gap-2 text-sm text-sage-700">
                  <span className="mt-0.5 text-xs font-semibold text-sage-500">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {rankedFacilities.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-500 mb-2">
            Tap a feature to see where it is
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rankedFacilities.map((facility, index) => {
              const icon = FACILITY_ICONS[facility.type] ?? { emoji: "📍", color: "#374151" };
              const selected = facility.id === selectedFacility?.id;
              const mapped = mappedFacilities.find((entry) => entry.id === facility.id);

              return (
                <button
                  key={facility.id}
                  type="button"
                  onClick={() => setSelectedFacilityId(facility.id)}
                  className={`text-left rounded-xl border px-3 py-3 transition-colors focus-calm ${
                    selected
                      ? "border-sage-300 bg-sage-50"
                      : "border-sage-100 bg-white hover:border-sage-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0">{icon.emoji}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-sage-800">{facility.label}</p>
                        {index === 0 && (
                          <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-medium text-sage-700">
                            Best match for this section
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sage-500 mt-0.5">
                        {facility.floor ?? "Location details below"}
                        {mapped?.isApproximateLocation ? " · approximate map marker" : " · shown on map"}
                      </p>
                      {(facility.description || facility.notes) && (
                        <p className="text-xs text-sage-500 mt-1">{facility.description ?? facility.notes}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
