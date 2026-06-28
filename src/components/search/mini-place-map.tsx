"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MiniPlaceMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

export function MiniPlaceMap({ latitude, longitude, name }: MiniPlaceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [longitude, latitude],
      zoom: 14,
      interactive: false,
      attributionControl: false,
    });

    new maplibregl.Marker({ color: "#6366f1" }).setLngLat([longitude, latitude]).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, name]);

  return (
    <div
      ref={containerRef}
      className="h-36 w-full overflow-hidden rounded-xl border border-border/20"
      aria-label={`Map showing ${name}`}
    />
  );
}
