"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapNearbyControls } from "@/components/map/map-nearby-controls";
import { MapPlacePopup } from "@/components/map/map-place-popup";
import { RandomSidequestFab } from "@/components/map/random-sidequest-fab";
import {
  filterPlacesWithinRadius,
  getPlacesBounds,
  hasCoordinates,
  placesToGeoJSON,
} from "@/lib/map/geo";
import { pickRandomMapPlace } from "@/lib/map/random-place";
import { registerMapMarkerImages } from "@/lib/map/marker-images";
import type { GeoPoint, MapPlace, NearbyRadiusKm } from "@/lib/map/types";
import type { PlaceCard } from "@/lib/db/types";

const PLACES_SOURCE = "collection-places";
const CLUSTER_LAYER = "places-clusters";
const CLUSTER_COUNT_LAYER = "places-cluster-count";
const UNCLUSTERED_LAYER = "places-unclustered";

function clusterCenterCoords(geometry: {
  type?: string;
  coordinates?: number[];
}): [number, number] | null {
  if (geometry.type === "Point" && geometry.coordinates?.length === 2) {
    return [geometry.coordinates[0], geometry.coordinates[1]];
  }
  return null;
}

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

function toMapPlaces(places: PlaceCard[]): MapPlace[] {
  return places.map((p) => ({
    ...p,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    visitStatus: p.visitStatus ?? "saved",
  }));
}

interface CollectionMapViewProps {
  places: PlaceCard[];
  loading?: boolean;
}

export function CollectionMapView({ places, loading }: CollectionMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const fitNonceRef = useRef(0);

  const [mapReady, setMapReady] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<NearbyRadiusKm | null>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const allMapPlaces = useMemo(() => toMapPlaces(places), [places]);

  const visiblePlaces = useMemo(() => {
    if (!nearbyRadiusKm || !userLocation) return allMapPlaces;
    return filterPlacesWithinRadius(allMapPlaces, userLocation, nearbyRadiusKm);
  }, [allMapPlaces, nearbyRadiusKm, userLocation]);

  const mappablePlaces = useMemo(
    () => visiblePlaces.filter(hasCoordinates),
    [visiblePlaces]
  );

  const mappablePlacesRef = useRef(mappablePlaces);
  mappablePlacesRef.current = mappablePlaces;

  const missingCoordsCount = visiblePlaces.length - mappablePlaces.length;

  const flyToPlace = useCallback((place: MapPlace, openPopup = true) => {
    const map = mapRef.current;
    if (!map || !hasCoordinates(place)) return;

    map.flyTo({
      center: [place.longitude, place.latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: 900,
      essential: true,
    });

    if (openPopup) setSelectedPlace(place);
  }, []);

  const handleRandomSidequest = useCallback(() => {
    const picked = pickRandomMapPlace(mappablePlaces, { preferUnvisited: true });
    if (picked) flyToPlace(picked, true);
  }, [mappablePlaces, flyToPlace]);

  const requestNearbyRadius = useCallback((radius: NearbyRadiusKm | null) => {
    setNearbyRadiusKm(radius);
    setLocationError(null);

    if (radius === null) return;

    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported in this browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        setLocating(false);
        setLocationError("Enable location access to use nearby mode");
        setNearbyRadiusKm(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [0, 20],
      zoom: 2,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      registerMapMarkerImages(map);

      map.addSource(PLACES_SOURCE, {
        type: "geojson",
        data: placesToGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 55,
      });

      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: PLACES_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#14b8a6",
            8,
            "#0d9488",
            20,
            "#f59e0b",
            40,
            "#d97706",
          ],
          "circle-radius": ["step", ["get", "point_count"], 22, 8, 28, 20, 34, 40, 40],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: PLACES_SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Regular"],
          "text-size": 15,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(15, 23, 42, 0.5)",
          "text-halo-width": 1.5,
        },
      });

      map.addLayer({
        id: UNCLUSTERED_LAYER,
        type: "symbol",
        source: PLACES_SOURCE,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "markerIcon"],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, 1.2,
            13, 1.8,
            15, 2,
            17, 1.75,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-anchor": "bottom",
        },
      });

      map.on("click", CLUSTER_LAYER, async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource(PLACES_SOURCE) as maplibregl.GeoJSONSource;
        if (clusterId == null || !features[0]) return;
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const coords = clusterCenterCoords(features[0].geometry);
          if (!coords) return;
          map.easeTo({ center: coords, zoom });
        } catch {
          /* cluster expansion failed */
        }
      });

      map.on("click", UNCLUSTERED_LAYER, (e) => {
        const feature = e.features?.[0];
        const placeId = feature?.properties?.id as string | undefined;
        if (!placeId) return;
        const place = mappablePlacesRef.current.find((p) => p.id === placeId);
        if (place) setSelectedPlace(place);
      });

      map.on("mouseenter", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", UNCLUSTERED_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", UNCLUSTERED_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON when visible places change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getSource(PLACES_SOURCE) as maplibregl.GeoJSONSource | undefined;
    source?.setData(placesToGeoJSON(visiblePlaces));
  }, [visiblePlaces, mapReady]);

  // Fit bounds when mappable places change
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const bounds = getPlacesBounds(mappablePlaces);
    fitNonceRef.current += 1;
    const nonce = fitNonceRef.current;

    if (!bounds) return;

    const timer = setTimeout(() => {
      if (nonce !== fitNonceRef.current) return;

      if (mappablePlaces.length === 1) {
        const p = mappablePlaces[0];
        map.flyTo({
          center: [p.longitude, p.latitude],
          zoom: 13,
          duration: 800,
        });
        return;
      }

      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 800 });
    }, 100);

    return () => clearTimeout(timer);
  }, [mappablePlaces, mapReady]);

  // User location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    if (!userLocation) return;

    const el = document.createElement("div");
    el.className =
      "h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg shadow-blue-500/50";
    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map);
  }, [userLocation, mapReady]);

  // Close popup if selected place filtered out
  useEffect(() => {
    if (selectedPlace && !visiblePlaces.some((p) => p.id === selectedPlace.id)) {
      setSelectedPlace(null);
    }
  }, [visiblePlaces, selectedPlace]);

  return (
    <div className="relative">
      {/* Map canvas */}
      <div
        className="relative h-[min(70vh,520px)] w-full overflow-hidden rounded-2xl border border-border/40 md:h-[min(72vh,600px)]"
        style={{ isolation: "isolate" }}
      >
        <div ref={containerRef} className="h-full w-full [&_.maplibregl-canvas]:outline-none" />

        {/* Dark discovery overlay — keeps OSM tiles readable but on-brand */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5"
          aria-hidden
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <p className="text-sm text-muted">Loading places…</p>
          </div>
        )}

        {!loading && mappablePlaces.length === 0 && (
          <div className="absolute inset-x-4 top-4 rounded-xl border border-border/50 bg-card/95 px-4 py-3 text-center text-sm text-muted backdrop-blur-md">
            {visiblePlaces.length > 0
              ? "Places match your filters but none have map coordinates yet. Open places to enrich locations."
              : "No places match your filters."}
          </div>
        )}

        {/* Nearby — desktop: top-left · mobile: bottom-left collapsible */}
        <div className="absolute bottom-14 left-3 z-10 md:hidden">
          <MapNearbyControls
            radiusKm={nearbyRadiusKm}
            onRadiusChange={requestNearbyRadius}
            locating={locating}
            locationError={locationError}
            collapsible
          />
        </div>
        <div className="absolute left-4 top-3 z-10 hidden md:block">
          <MapNearbyControls
            radiusKm={nearbyRadiusKm}
            onRadiusChange={requestNearbyRadius}
            locating={locating}
            locationError={locationError}
          />
          {missingCoordsCount > 0 && mappablePlaces.length > 0 && (
            <p className="mt-2 rounded-lg bg-black/50 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur-sm">
              {missingCoordsCount} place{missingCoordsCount !== 1 ? "s" : ""} hidden — no coordinates
            </p>
          )}
        </div>

        {/* Marker legend */}
        <div className="absolute bottom-3 left-3 z-10 hidden rounded-lg border border-border/40 bg-card/90 px-2.5 py-1.5 text-[10px] text-muted backdrop-blur-md sm:block">
          <span className="text-foreground">○ Saved</span>
          <span className="mx-1.5">·</span>
          <span className="text-primary">✓ Visited</span>
        </div>

        {/* Random SideQuest FAB */}
        <div className="absolute bottom-3 right-3 z-10">
          <RandomSidequestFab
            onClick={handleRandomSidequest}
            disabled={mappablePlaces.length === 0}
          />
        </div>

        {/* Selected place popup — bottom sheet on mobile, floating card on desktop */}
        {selectedPlace && (
          <>
            <div
              className="absolute inset-0 z-20 bg-black/20 sm:hidden"
              onClick={() => setSelectedPlace(null)}
              aria-hidden
            />
            <div className="absolute inset-x-3 bottom-3 z-30 sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[min(100%,360px)]">
              <MapPlacePopup place={selectedPlace} onClose={() => setSelectedPlace(null)} />
            </div>
          </>
        )}
      </div>

      {/* Place count summary */}
      <p className="mt-2 text-center text-xs text-muted">
        {mappablePlaces.length} place{mappablePlaces.length !== 1 ? "s" : ""} on map
        {nearbyRadiusKm && userLocation && ` within ${nearbyRadiusKm} km`}
      </p>
    </div>
  );
}
