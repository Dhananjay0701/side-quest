"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ScopedSearch } from "@/components/layout/hero-search";
import {
  PlaceCardPinterest,
  PlaceCardPinterestSkeleton,
} from "@/components/places/place-card";
import { TagPill } from "@/components/places/tag-pill";
import { VisibilityToggle } from "@/components/collections/visibility-toggle";
import { CoverUploadButton } from "@/components/collections/cover-upload-button";
import { formatPlaceCount } from "@/lib/utils";
import { getCollectionGradient } from "@/lib/images/collage";
import type { PlaceCard } from "@/lib/db/types";

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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const gradient = getCollectionGradient(collectionId);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ collectionId });
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));

    const res = await fetch(`/api/places?${params}`);
    const json = await res.json();
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

  const withPhotos = places.filter((p) => p.coverImageUrl).length;

  return (
    <div className="px-[4vw] py-[3vw] md:px-6 md:py-6">
      {/* Hero — full-bleed cover with overlaid text (matches collection cards) */}
      <div className="relative mb-[3vw] min-h-[12rem] overflow-hidden rounded-2xl border border-border/40 md:mb-6 md:min-h-[14rem]">
        <div className="absolute inset-0">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={name}
              fill
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

      {/* Scoped search */}
      <div className="mb-[3vw] w-full md:mb-4">
        <ScopedSearch
          placeholder="Search places in this collection..."
          onSearch={setQuery}
        />
      </div>

      {/* Category filter chips */}
      {initialFilters.categories.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <TagPill label="All" selected={!category} onClick={() => setCategory(null)} />
          {initialFilters.categories.map((cat) => (
            <TagPill
              key={cat.slug}
              label={`${cat.name} (${cat.count})`}
              selected={category === cat.slug}
              onClick={() => setCategory(category === cat.slug ? null : cat.slug)}
            />
          ))}
        </div>
      )}

      {/* Tag filters */}
      {initialFilters.tags.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {initialFilters.tags.map((tag) => (
            <TagPill
              key={tag.slug}
              label={tag.name}
              selected={selectedTags.includes(tag.slug)}
              onClick={() => toggleTag(tag.slug)}
            />
          ))}
        </div>
      )}

      {/* Pinterest masonry grid */}
      {loading ? (
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
      )}
    </div>
  );
}
