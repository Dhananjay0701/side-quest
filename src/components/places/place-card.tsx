"use client";

import Link from "next/link";
import { ChevronRight, Heart, MapPin, Star } from "lucide-react";
import { AssetImage } from "@/components/images/asset-image";
import { TagPill } from "@/components/places/tag-pill";
import { getAboveFoldLimits } from "@/lib/images/cache/policy";
import { cn } from "@/lib/utils";
import type { PlaceCard } from "@/lib/db/types";
import { useEffect, useState } from "react";

const PHOTO_ASPECTS = ["aspect-[3/4]", "aspect-[4/5]", "aspect-square", "aspect-[5/6]", "aspect-[2/3]"];

function getPlaceAspectClass(id: string, hasImage: boolean): string {
  if (!hasImage) return "aspect-[4/5]";
  const idx = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % PHOTO_ASPECTS.length;
  return PHOTO_ASPECTS[idx];
}

interface PlaceCardSmProps {
  place: PlaceCard;
  className?: string;
  priorityImage?: boolean;
  cacheTier?: "homepage" | "none" | "viewed";
}

export function PlaceCardSm({
  place,
  className,
  priorityImage = false,
  cacheTier = "none",
}: PlaceCardSmProps) {
  return (
    <Link
      href={`/places/${place.id}`}
      className={cn(
        "group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border/30 bg-card/70 transition-colors active:bg-card/90 lg:hover:border-primary/25",
        "h-[200px] w-[148px] md:h-[190px] md:w-[160px] lg:h-auto lg:w-[168px]",
        className
      )}
    >
      <div className="relative h-[100px] w-full shrink-0 overflow-hidden bg-card md:h-[90px]">
        {place.coverImageUrl ? (
          <AssetImage
            src={place.coverImageUrl}
            alt={place.name}
            className="transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 767px) 148px, 168px"
            priority={priorityImage}
            cacheTier={cacheTier}
            cacheOnVisible={!priorityImage}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-border/20">
            <MapPin className="h-5 w-5 text-border" />
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-sm"
        >
          <Heart className="h-2.5 w-2.5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 p-2.5">
        <p className="line-clamp-2 text-[12px] font-semibold leading-tight">{place.name}</p>
        <div className="flex items-center justify-between gap-1">
          <p className="line-clamp-1 text-[10px] text-muted/70">
            {place.address ?? place.collectionName ?? ""}
          </p>
          {place.rating != null && (
            <div className="flex shrink-0 items-center gap-0.5 text-[10px] text-secondary">
              <Star className="h-2.5 w-2.5 fill-current" />
              {place.rating}
            </div>
          )}
        </div>
        {place.category && (
          <span className="w-fit rounded-full border border-border/40 bg-card px-2 py-0.5 text-[10px] text-muted">
            {place.category.name}
          </span>
        )}
      </div>
    </Link>
  );
}

export function PlaceCardMd({ place }: { place: PlaceCard }) {
  return (
    <Link
      href={`/places/${place.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 transition-colors active:bg-card/80 lg:p-5 lg:hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">{place.name}</h3>
          {place.category && (
            <p className="mt-0.5 text-[12px] text-primary">{place.category.name}</p>
          )}
        </div>
        {place.rating != null && (
          <div className="flex items-center gap-1 text-xs text-secondary">
            <Star className="h-3.5 w-3.5 fill-current" />
            {place.rating}
          </div>
        )}
      </div>

      {place.shortDescription && (
        <p className="text-[13px] leading-relaxed text-muted">{place.shortDescription}</p>
      )}

      {place.address && (
        <p className="flex items-center gap-1 text-[11px] text-muted">
          <MapPin className="h-3 w-3" />
          {place.address}
        </p>
      )}

      {place.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {place.tags.slice(0, 5).map((tag) => (
            <TagPill key={tag.slug} label={tag.name} />
          ))}
        </div>
      )}
    </Link>
  );
}

export function PlaceCardPinterest({ place }: { place: PlaceCard }) {
  const aspect = getPlaceAspectClass(place.id, Boolean(place.coverImageUrl));

  return (
    <Link
      href={`/places/${place.id}`}
      className="group mb-4 block break-inside-avoid overflow-hidden rounded-2xl border border-border/30 bg-card/50 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-black/30"
    >
      <div className={cn("relative w-full overflow-hidden bg-card", aspect)}>
        {place.coverImageUrl ? (
          <AssetImage
            src={place.coverImageUrl}
            alt={place.name}
            className="transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            cacheTier="viewed"
            cacheOnVisible
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-card via-border/10 to-card">
            <MapPin className="h-8 w-8 text-border/80" />
            <span className="px-4 text-center text-[11px] text-muted/60">Photo on open</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />

        {place.rating != null && (
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            <Star className="h-3 w-3 fill-secondary text-secondary" />
            {place.rating}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-white">
            {place.name}
          </h3>

          {place.category && (
            <p className="mt-1 line-clamp-1 text-[12px] text-white/70">{place.category.name}</p>
          )}
          {!place.category && place.address && (
            <p className="mt-1 line-clamp-1 text-[12px] text-white/70 hidden md:block">
              {place.address}
            </p>
          )}

          {place.tags.length > 0 && (
            <div className="mt-2 hidden flex-wrap gap-1 md:flex">
              {place.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] text-white/75 backdrop-blur-sm"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PlaceCardPinterestSkeleton() {
  return (
    <div className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border/20 bg-card/40">
      <div className="aspect-[4/5] animate-pulse bg-gradient-to-br from-card to-border/20" />
    </div>
  );
}

function useAboveFoldRecentLimit() {
  const [limit, setLimit] = useState(() => getAboveFoldLimits().priorityRecentThumbnails);

  useEffect(() => {
    const update = () => setLimit(getAboveFoldLimits().priorityRecentThumbnails);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return limit;
}

export function RecentlyAddedRow({
  places,
  cacheTier = "homepage",
}: {
  places: PlaceCard[];
  cacheTier?: "homepage" | "none";
}) {
  const aboveFoldLimit = useAboveFoldRecentLimit();
  if (places.length === 0) return null;

  return (
    <section className="border-t border-border/20 px-4 pb-6 pt-3 md:px-6 md:pt-4">
      <div className="mb-2 flex items-center justify-between md:mb-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="text-muted/50">⊙</span>
          Recently Viewed
        </h2>
        <button className="hidden items-center gap-0.5 text-xs text-muted/70 hover:text-muted md:flex">
          View all <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="scrollbar-hide -mx-1 flex min-h-[200px] gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory md:min-h-0">
        {places.map((place, idx) => (
          <PlaceCardSm
            key={place.id}
            place={place}
            priorityImage={idx < aboveFoldLimit}
            cacheTier={cacheTier}
          />
        ))}
      </div>
    </section>
  );
}
