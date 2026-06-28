"use client";

import Link from "next/link";
import { ExternalLink, MapPin, Star, X } from "lucide-react";
import { AssetImage } from "@/components/images/asset-image";
import { TagPill } from "@/components/places/tag-pill";
import { getCategoryMarkerEmoji } from "@/lib/map/category-markers";
import type { MapPlace } from "@/lib/map/types";
import { cn } from "@/lib/utils";

interface MapPlacePopupProps {
  place: MapPlace;
  onClose: () => void;
  className?: string;
}

export function MapPlacePopup({ place, onClose, className }: MapPlacePopupProps) {
  const emoji = getCategoryMarkerEmoji(place.category?.slug);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card/95 shadow-2xl shadow-black/50 backdrop-blur-md",
        className
      )}
    >
      <div className="relative h-36 w-full bg-card sm:h-40">
        {place.coverImageUrl ? (
          <AssetImage
            src={place.coverImageUrl}
            alt={place.name}
            sizes="(max-width: 640px) 100vw, 360px"
            cacheTier="viewed"
            cacheOnVisible={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-border/30 text-4xl">
            {emoji}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {place.visitStatus === "visited" && (
          <span className="absolute left-2 top-2 rounded-full bg-teal-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            ✓ Visited
          </span>
        )}
        {place.visitStatus === "saved" && (
          <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
            ○ Saved
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-foreground">{place.name}</h3>
            {place.rating != null && (
              <span className="flex shrink-0 items-center gap-0.5 text-xs text-secondary">
                <Star className="h-3 w-3 fill-secondary" />
                {place.rating.toFixed(1)}
              </span>
            )}
          </div>
          {place.category && (
            <p className="mt-0.5 text-xs text-primary">
              {emoji} {place.category.name}
            </p>
          )}
          {place.address && (
            <p className="mt-1 flex items-start gap-1 text-xs text-muted">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              {place.address}
            </p>
          )}
        </div>

        {place.shortDescription && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">{place.shortDescription}</p>
        )}

        {place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {place.tags.slice(0, 4).map((tag) => (
              <TagPill key={tag.slug} label={tag.name} className="px-2 py-0.5 text-[10px]" />
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {place.googleMapsUrl ? (
            <a
              href={place.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Google Maps
            </a>
          ) : null}
          <Link
            href={`/places/${place.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-primary/90"
          >
            Place Details
          </Link>
        </div>
      </div>
    </div>
  );
}
