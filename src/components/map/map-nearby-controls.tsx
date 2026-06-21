"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Navigation, LocateFixed } from "lucide-react";
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
  /** Collapsed chip that expands horizontally — for mobile map overlay */
  collapsible?: boolean;
  className?: string;
}

function RadiusButtons({
  radiusKm,
  onRadiusChange,
  locating,
  className,
}: Pick<MapNearbyControlsProps, "radiusKm" | "onRadiusChange" | "locating" | "className">) {
  return (
    <>
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted">
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
          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
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
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
            radiusKm === value
              ? "bg-primary/15 text-primary"
              : "text-muted hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </>
  );
}

export function MapNearbyControls({
  radiusKm,
  onRadiusChange,
  locating,
  locationError,
  collapsible = false,
  className,
}: MapNearbyControlsProps) {
  const [expanded, setExpanded] = useState(false);

  if (collapsible) {
    return (
      <div className={cn("max-w-[calc(100vw-5rem)]", className)}>
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/95 px-3 py-2 text-[11px] font-medium text-foreground shadow-lg backdrop-blur-md"
          >
            <Navigation className="h-3.5 w-3.5 text-primary" />
            Nearby
            {radiusKm != null && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                {radiusKm} km
              </span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-muted" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-border/50 bg-card/95 py-1.5 pl-1.5 pr-2 shadow-lg backdrop-blur-md scrollbar-hide">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Collapse nearby options"
              className="sticky left-0 shrink-0 rounded-full bg-card/95 p-1.5 text-muted transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <RadiusButtons
              radiusKm={radiusKm}
              onRadiusChange={onRadiusChange}
              locating={locating}
            />
          </div>
        )}
        {locationError && expanded && (
          <p className="mt-1 max-w-[200px] text-[10px] text-red-400">{locationError}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card/90 px-3 py-2 backdrop-blur-md",
        className
      )}
    >
      <RadiusButtons
        radiusKm={radiusKm}
        onRadiusChange={onRadiusChange}
        locating={locating}
      />
      {locationError && (
        <span className="w-full text-[10px] text-red-400">{locationError}</span>
      )}
    </div>
  );
}
