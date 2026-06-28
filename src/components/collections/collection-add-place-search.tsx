"use client";

import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { Globe2, MapPin, Plus, Search, X } from "lucide-react";
import { AddPlacePreview, type PlaceSavedInfo } from "@/components/search/add-place-preview";
import { SaveToCollectionToast } from "@/components/search/save-to-collection-toast";
import { SearchResultItem, SearchResultSkeleton } from "@/components/search/search-result-item";
import { useSearchContext } from "@/components/search/search-provider";
import { useSearchSuggest } from "@/lib/query/hooks";
import type { ExternalPlaceSuggestion, LocalPlaceHit } from "@/lib/search/types";
import { cn } from "@/lib/utils";

type SelectedPreview = LocalPlaceHit | ExternalPlaceSuggestion;

interface CollectionAddPlaceSearchProps {
  collectionId: string;
  collectionName: string;
  onPlaceAdded?: (info: PlaceSavedInfo) => void;
  className?: string;
}

export function CollectionAddPlaceSearch({
  collectionId,
  collectionName,
  onPlaceAdded,
  className,
}: CollectionAddPlaceSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { sessionToken } = useSearchContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<SelectedPreview | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const trimmed = query.trim();
  const suggest = useSearchSuggest(query, {
    sessionToken,
    enabled: open && !preview && trimmed.length > 0,
    hero: true,
  });

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
        if (!preview) setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [preview]);

  function handleSaved(info: PlaceSavedInfo) {
    onPlaceAdded?.(info);
    setSaveNotice(info.collectionName);
    setPreview(null);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} data-collection-add-search className={cn("relative flex flex-col items-center", className)}>
      {!open ? (
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-card/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-card/80"
          >
            <Plus className="h-4 w-4 text-primary" />
            Add places
          </button>
          {saveNotice ? <SaveToCollectionToast collectionName={saveNotice} /> : null}
        </div>
      ) : (
        <div className="w-full max-w-xl rounded-2xl border border-border/25 bg-[#0d1424]/95 p-3 shadow-xl backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/50" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPreview(null);
                }}
                placeholder="Search places to add…"
                autoFocus
                className="h-10 w-full rounded-xl border border-border/20 bg-background/30 pl-9 pr-3 text-sm outline-none focus:border-primary/30"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPreview(null);
                setQuery("");
              }}
              className="rounded-lg p-2 text-muted/50 hover:bg-background/30 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div data-suggestion-slot="in-collection" className="hidden" aria-hidden />

          {preview ? (
            <AddPlacePreview
              place={preview}
              preferredCollectionId={collectionId}
              onBack={() => setPreview(null)}
              onDone={() => {
                setPreview(null);
                setQuery("");
                setOpen(false);
              }}
              onSaved={handleSaved}
              isAuthenticated
            />
          ) : (
            <Command shouldFilter={false} className="bg-transparent">
              <Command.List className="max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="space-y-1 p-1">
                    <SearchResultSkeleton />
                    <SearchResultSkeleton />
                  </div>
                ) : null}

                {trimmed && results ? (
                  <>
                    {results.external.length > 0 ? (
                      <Command.Group heading="Discover" className="px-1">
                        {results.external.slice(0, 5).map((ext) => (
                          <Command.Item
                            key={ext.externalId}
                            value={`ext-${ext.externalId}`}
                            onSelect={() => setPreview(ext)}
                            className="rounded-lg"
                          >
                            <SearchResultItem
                              title={ext.name}
                              subtitle={ext.address}
                              query={trimmed}
                              badge="Add"
                              icon={<Globe2 className="h-4 w-4" />}
                              onSelect={() => setPreview(ext)}
                            />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    {results.places.length > 0 ? (
                      <Command.Group heading="In your library" className="px-1">
                        {results.places.map((place) => (
                          <Command.Item
                            key={place.id}
                            value={`place-${place.id}`}
                            onSelect={() => setPreview(place)}
                            className="rounded-lg"
                          >
                            <SearchResultItem
                              title={place.name}
                              subtitle={place.address ?? undefined}
                              query={trimmed}
                              icon={<MapPin className="h-4 w-4" />}
                              onSelect={() => setPreview(place)}
                            />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    {!loading &&
                    results.external.length === 0 &&
                    results.places.length === 0 ? (
                      <Command.Empty className="py-6 text-center text-sm text-muted/50">
                        No results — try another search
                      </Command.Empty>
                    ) : null}
                  </>
                ) : (
                  <p className="py-4 text-center text-xs text-muted/45">
                    Search by name or neighborhood
                  </p>
                )}
              </Command.List>
            </Command>
          )}
        </div>
      )}
    </div>
  );
}
