"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Compass, Globe2, MapPin, Search } from "lucide-react";
import { AddPlacePreview, type PlaceSavedInfo } from "@/components/search/add-place-preview";
import { SaveToCollectionToast } from "@/components/search/save-to-collection-toast";
import { SearchResultItem, SearchResultSkeleton } from "@/components/search/search-result-item";
import { useSearchContext } from "@/components/search/search-provider";
import { clientProfileToProfile, useProfileQuery, useSearchSuggest } from "@/lib/query/hooks";
import type { ExternalPlaceSuggestion, LocalPlaceHit } from "@/lib/search/types";
import { cn } from "@/lib/utils";

type SelectedPreview = LocalPlaceHit | ExternalPlaceSuggestion;

interface HeroSearchAutocompleteProps {
  placeholder?: string;
  className?: string;
  variant?: "hero" | "compact";
}

export function HeroSearchAutocomplete({
  placeholder = "Search places, collections, or discover somewhere new…",
  className,
  variant = "hero",
}: HeroSearchAutocompleteProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { sessionToken, recentSearches, recordSearch } = useSearchContext();
  const { data: clientProfile } = useProfileQuery();
  const profile = clientProfile ? clientProfileToProfile(clientProfile) : null;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SelectedPreview | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const suggest = useSearchSuggest(query, {
    sessionToken,
    enabled: open && !preview && query.trim().length > 0,
    hero: true,
  });

  const trimmed = query.trim();
  const results = suggest.data;
  const loading = suggest.isFetching && !suggest.data;

  useEffect(() => {
    if (!saveNotice) return;
    const timer = window.setTimeout(() => setSaveNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setPreview(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function closePanel() {
    setOpen(false);
    setPreview(null);
  }

  function navigateTo(path: string) {
    recordSearch(query);
    closePanel();
    setQuery("");
    router.push(path);
  }

  function openAddPreview(place: SelectedPreview) {
    recordSearch(query);
    setPreview(place);
  }

  function handleSaved(info: PlaceSavedInfo) {
    setSaveNotice(info.collectionName);
    setPreview(null);
    setQuery("");
    setOpen(false);
  }

  const inputClass =
    variant === "hero"
      ? "h-12 w-full rounded-full border border-border/60 bg-[#1a2540]/80 pl-10 pr-4 text-[15px] text-foreground shadow-md placeholder:text-muted/50 transition-all focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 md:h-11 md:text-[13px]"
      : "h-11 w-full rounded-[14px] border border-border/30 bg-card/80 px-10 text-sm tracking-tight text-foreground placeholder:font-light placeholder:text-muted/30 transition-colors focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/20";

  const showResultsPanel = open && (preview || Boolean(trimmed));
  const showRecentPills = open && !preview && !trimmed && recentSearches.length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted/50",
            variant === "hero" ? "left-4" : "left-3.5"
          )}
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPreview(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-expanded={Boolean(showResultsPanel)}
          aria-controls="hero-search-results"
          className={inputClass}
        />
      </div>

      {showRecentPills ? (
        <div className="pointer-events-none absolute left-0 right-0 top-full z-40 mt-1.5">
          <div className="pointer-events-auto flex flex-nowrap items-center gap-1.5 overflow-x-auto px-0.5 scrollbar-hide">
            {recentSearches.slice(0, 5).map((recent) => (
              <button
                key={recent}
                type="button"
                onClick={() => setQuery(recent)}
                className="shrink-0 truncate rounded-full border border-border/15 bg-[#0d1424]/95 px-2.5 py-0.5 text-[11px] text-muted/70 backdrop-blur-sm transition-colors hover:border-border/30 hover:text-foreground/80"
              >
                {recent}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {saveNotice ? (
        <SaveToCollectionToast
          collectionName={saveNotice}
          className="pointer-events-none absolute left-0 right-0 top-full z-40 mt-1.5 px-0.5"
        />
      ) : null}

      {showResultsPanel ? (
        <div
          id="hero-search-results"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-border/25 bg-[#0d1424] shadow-2xl"
        >
          {preview ? (
            <div className="p-4">
              <AddPlacePreview
                place={preview}
                onBack={() => setPreview(null)}
                onDone={closePanel}
                onSaved={handleSaved}
                isAuthenticated={Boolean(profile)}
              />
            </div>
          ) : (
            <Command shouldFilter={false} className="bg-transparent">
              <Command.List className="max-h-[min(50vh,320px)] overflow-y-auto p-2">
                {loading ? (
                  <div className="space-y-1 p-1">
                    <SearchResultSkeleton />
                    <SearchResultSkeleton />
                  </div>
                ) : null}

                {trimmed && results ? (
                  <>
                    {results.external.length > 0 ? (
                      <Command.Group heading="Discover new places" className="px-1">
                        {results.external.slice(0, 3).map((ext) => (
                          <Command.Item
                            key={ext.externalId}
                            value={`ext-${ext.externalId}`}
                            onSelect={() => openAddPreview(ext)}
                            className="rounded-lg"
                          >
                            <SearchResultItem
                              title={ext.name}
                              subtitle={ext.address}
                              query={trimmed}
                              badge="Add"
                              icon={<Globe2 className="h-4 w-4" />}
                              onSelect={() => openAddPreview(ext)}
                            />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    {results.places.length > 0 ? (
                      <Command.Group heading="In your collections" className="px-1">
                        {results.places.map((place) => (
                          <Command.Item
                            key={place.id}
                            value={`place-${place.id}`}
                            onSelect={() =>
                              place.inCollections?.[0]
                                ? navigateTo(`/collections/${place.inCollections[0].id}`)
                                : navigateTo(`/places/${place.id}`)
                            }
                            className="rounded-lg"
                          >
                            <SearchResultItem
                              title={place.name}
                              subtitle={
                                place.inCollections?.length
                                  ? `In ${place.inCollections.map((c) => c.name).join(", ")}`
                                  : place.address
                              }
                              query={trimmed}
                              icon={<MapPin className="h-4 w-4" />}
                              onSelect={() =>
                                place.inCollections?.[0]
                                  ? navigateTo(`/collections/${place.inCollections[0].id}`)
                                  : navigateTo(`/places/${place.id}`)
                              }
                            />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    {results.collections.length > 0 ? (
                      <Command.Group heading="Your collections" className="px-1">
                        {results.collections.map((c) => (
                          <Command.Item
                            key={c.id}
                            value={`collection-${c.id}`}
                            onSelect={() => navigateTo(`/collections/${c.id}`)}
                            className="rounded-lg"
                          >
                            <SearchResultItem
                              title={c.name}
                              subtitle={`${c.placeCount} places${!c.isPublic ? " · private" : ""}`}
                              query={trimmed}
                              icon={<Compass className="h-4 w-4" />}
                              onSelect={() => navigateTo(`/collections/${c.id}`)}
                            />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    {!loading &&
                    results.external.length === 0 &&
                    results.places.length === 0 &&
                    results.collections.length === 0 ? (
                      <Command.Empty className="py-8 text-center text-sm text-muted/50">
                        No results — try a different search
                      </Command.Empty>
                    ) : null}
                  </>
                ) : null}
              </Command.List>
            </Command>
          )}
        </div>
      ) : null}
    </div>
  );
}
