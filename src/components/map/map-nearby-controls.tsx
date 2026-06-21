"use client";

import { Navigation, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NearbyRadiusKm } from "@/lib/map/types";

const RADIUS_OPTIONS: { value: NearbyRadiusKm; label: string }[] = [
  { value: 1, label: "1 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 20, label: "20 km" },
];

interface MapNearbyControlsProps {
  radiusKm: NearbyRadiusKm | null;
  onRadiusChange: (radius: NearbyRadiusKm | null) => void;
  locating: boolean;
  locationError: string | null;
  className?: string;
}

export function MapNearbyControls({
  radiusKm,
  onRadiusChange,
  locating,
  locationError,
  className,
}: MapNearbyControlsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card/90 px-3 py-2 backdrop-blur-md",
        className
      )}
    >
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted">
        {locating ? (
          <LocateFixed className="h-3.5 w-3.5 animate-pulse text-primary" />
        ) : (
          <Navigation className="h-3.5 w-3.5" />
        )}
        Nearby
      </span>
      <button
        type="button"
        onClick={() => onRadiusChange(null)}
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
          radiusKm === null
            ? "bg-primary/15 text-primary"
            : "text-muted hover:text-foreground"
        )}
      >
        Off
      </button>
      {RADIUS_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onRadiusChange(value)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
            radiusKm === value
              ? "bg-primary/15 text-primary"
              : "text-muted hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
      {locationError && (
        <span className="w-full text-[10px] text-red-400">{locationError}</span>
      )}
    </div>
  );
}
