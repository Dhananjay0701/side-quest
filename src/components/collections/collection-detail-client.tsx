"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CollectionFilters } from "@/components/collections/collection-filters";
import { CollectionViewToggle } from "@/components/collections/collection-view-toggle";
import { CoverUploadButton } from "@/components/collections/cover-upload-button";
import { VisibilityToggle } from "@/components/collections/visibility-toggle";
import {
  PlaceCardPinterest,
  PlaceCardPinterestSkeleton,
} from "@/components/places/place-card";
import { formatPlaceCount } from "@/lib/utils";
import { getCollectionGradient } from "@/lib/images/collage";
import { parseApiJson } from "@/lib/api/response";
import type { CollectionViewMode } from "@/lib/map/types";
import type { PlaceCard } from "@/lib/db/types";

const CollectionMapView = dynamic(
  () =>
    import("@/components/map/collection-map-view").then((m) => m.CollectionMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,520px)] items-center justify-center rounded-2xl border border-border/40 bg-card/30">
        <p className="text-sm text-muted">Loading map…</p>
      </div>
    ),
  }
);

interface CollectionDetailClientProps {
  collectionId: string;
  name: string;
  description: string | null;
  placeCount: number;
  coverImageUrl: string | null;
  isPublic: boolean;
  isOwner: boolean;
  initialFilters: {
    categories: { slug: string; name: string; count: number }[];
    tags: { slug: string; name: string; count: number }[];
  };
}

export function CollectionDetailClient({
  collectionId,
  name,
  description,
  placeCount,
  coverImageUrl,
  isPublic,
  isOwner,
  initialFilters,
}: CollectionDetailClientProps) {
  const [places, setPlaces] = useState<PlaceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<CollectionViewMode>("list");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const mapSectionRef = useRef<HTMLDivElement>(null);
  const gradient = getCollectionGradient(collectionId);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ collectionId, limit: "500" });
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));

    const res = await fetch(`/api/places?${params}`);
    const json = await parseApiJson<PlaceCard[]>(res);
    setPlaces(json.data ?? []);
    setLoading(false);
  }, [collectionId, query, category, selectedTags]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  function toggleTag(slug: string) {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    );
  }

  function handleViewModeChange(mode: CollectionViewMode) {
    setViewMode(mode);
  }

  // Scroll map into center of viewport when switching to map view
  useEffect(() => {
    if (viewMode !== "map") return;

    const scrollToMap = () => {
      mapSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    };

    // Wait for layout + dynamic map chunk
    const timer = window.setTimeout(scrollToMap, 80);
    return () => window.clearTimeout(timer);
  }, [viewMode]);

  const withPhotos = places.filter((p) => p.coverImageUrl).length;

  return (
    <div className="px-[4vw] py-[3vw] md:px-6 md:py-6">
      {/* Hero */}
      <div className="relative mb-[3vw] min-h-[12rem] overflow-hidden rounded-2xl border border-border/40 md:mb-6 md:min-h-[14rem]">
        <div className="absolute inset-0">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={name}
              fill
              unoptimized
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        </div>

        <div className="relative flex min-h-[12rem] flex-col md:min-h-[14rem]">
          <div className="flex items-start justify-between p-[4vw] md:p-5">
            <span className="inline-block rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              {formatPlaceCount(placeCount)}
              {!loading && withPhotos > 0 && (
                <span className="font-normal normal-case text-white/70">
                  {" "}
                  · {withPhotos} with photos
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {isOwner && <VisibilityToggle collectionId={collectionId} isPublic={isPublic} />}
              {isOwner && <CoverUploadButton collectionId={collectionId} />}
            </div>
          </div>

          <div className="mt-auto p-[4vw] md:p-5">
            <h1 className="text-[clamp(1.35rem,4.5vw,2rem)] font-semibold leading-tight tracking-tight text-white">
              {name}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-[clamp(0.8rem,2.5vw,0.95rem)] leading-relaxed text-white/65">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* List ↔ Map toggle */}
      <div className="mb-4 flex justify-center md:mb-5">
        <CollectionViewToggle mode={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* Shared filters — state preserved across view toggle */}
      <CollectionFilters
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        categories={initialFilters.categories}
        tags={initialFilters.tags}
      />

      {/* Content — ref used to scroll map into view */}
      <div ref={mapSectionRef} className="scroll-mt-6">
      {viewMode === "list" ? (
        loading ? (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <PlaceCardPinterestSkeleton key={i} />
            ))}
          </div>
        ) : places.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No places match your filters.</p>
        ) : (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
            {places.map((place) => (
              <PlaceCardPinterest key={place.id} place={place} />
            ))}
          </div>
        )
      ) : (
        <CollectionMapView places={places} loading={loading} />
      )}
      </div>
    </div>
  );
}
