"use client";

import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Building2, Compass, Globe2, MapPin, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddPlacePreview } from "@/components/search/add-place-preview";
import { SearchResultItem, SearchResultSkeleton } from "@/components/search/search-result-item";
import { useSearchContext } from "@/components/search/search-provider";
import { clientProfileToProfile, useProfileQuery, useSearchSuggest } from "@/lib/query/hooks";
import type {
  CitySearchHit,
  CollectionSearchHit,
  ExternalPlaceSuggestion,
  LocalPlaceHit,
} from "@/lib/search/types";
import { useEffect, useState } from "react";

interface SearchDialogProps {
  trigger?: React.ReactNode;
}

type SelectedPreview = LocalPlaceHit | ExternalPlaceSuggestion;

export function SearchDialog({ trigger }: SearchDialogProps) {
  const router = useRouter();
  const { open, setOpen, sessionToken, recentSearches, recordSearch, refreshSession } =
    useSearchContext();
  const { data: clientProfile } = useProfileQuery();
  const profile = clientProfile ? clientProfileToProfile(clientProfile) : null;

  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<SelectedPreview | null>(null);

  const suggest = useSearchSuggest(query, {
    sessionToken,
    enabled: open && !preview,
  });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPreview(null);
      refreshSession();
    }
  }, [open, refreshSession]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  function closeAndReset() {
    setOpen(false);
    setPreview(null);
    setQuery("");
  }

  function navigateTo(path: string) {
    recordSearch(query);
    closeAndReset();
    router.push(path);
  }

  function openPreview(place: SelectedPreview) {
    recordSearch(query);
    setPreview(place);
  }

  const results = suggest.data;
  const loading = suggest.isFetching && !suggest.data;
  const trimmed = query.trim();

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(true)}>
          {trigger}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border/15 px-4 pb-3 pt-4">
            <DialogTitle className="sr-only">Search</DialogTitle>
            {preview ? (
              <span className="text-sm font-medium">Add place</span>
            ) : (
              <div className="flex items-center gap-2 text-muted/50">
                <Search className="h-4 w-4" />
                <span className="text-sm">Search places, collections, cities…</span>
                <kbd className="ml-auto hidden rounded border border-border/30 px-1.5 py-0.5 text-[10px] sm:inline">
                  ⌘K
                </kbd>
              </div>
            )}
          </DialogHeader>

          {preview ? (
            <div className="p-4">
              <AddPlacePreview
                place={preview}
                onBack={() => setPreview(null)}
                onDone={closeAndReset}
                isAuthenticated={Boolean(profile)}
              />
            </div>
          ) : (
            <Command shouldFilter={false} className="bg-transparent">
              <div className="border-b border-border/10 px-3 py-2">
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search anywhere…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted/40"
                  autoFocus
                />
              </div>

              <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
                {loading ? (
                  <div className="space-y-1">
                    <SearchResultSkeleton />
                    <SearchResultSkeleton />
                    <SearchResultSkeleton />
                  </div>
                ) : null}

                {!trimmed && recentSearches.length > 0 ? (
                  <Command.Group heading="Recent">
                    {recentSearches.map((recent) => (
                      <Command.Item
                        key={recent}
                        value={`recent-${recent}`}
                        onSelect={() => setQuery(recent)}
                        className="rounded-lg"
                      >
                        <SearchResultItem
                          title={recent}
                          query=""
                          onSelect={() => setQuery(recent)}
                        />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {trimmed && results ? (
                  <>
                    {results.places.length > 0 ? (
                      <Command.Group heading="Places">
                        {results.places.map((place: LocalPlaceHit) => (
                          <Command.Item
                            key={place.id}
                            value={`place-${place.id}`}
                            onSelect={() => openPreview(place)}
                            className="rounded-lg"
                          >
                            <SearchResultItem
                              title={place.name}
                              subtitle={place.address}
                              query={trimmed}
                              icon={<MapPin className="h-4 w-4" />}
                              onSelect={() => openPreview(place)}
                            />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    {results.collections.length > 0 ? (
                      <Command.Group heading="Collections">
                        {results.collections.map((c: CollectionSearchHit) => (
                          <Command.Item
                            key={c.id}
                            value={`collection-${c.id}`}
                            onSelect={() => navigateTo(`/collections/${c.id}`)}
                            className="rounded-lg"
                          >
                            <SearchResultItem
                              title={c.name}
                              subtitle={`${c.placeCount} places`}
                              query={trimmed}
                              icon={<Compass className="h-4 w-4" />}
                              onSelect={() => navigateTo(`/collections/${c.id}`)}
                            />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    {results.cities.length > 0 ? (
                      <Command.Group heading="Cities">
                        {results.cities.map((city: CitySearchHit) => (
                          <Command.Item
                            key={city.id}
                            value={`city-${city.id}`}
                            onSelect={() => navigateTo(city.href)}
                            className="rounded-lg"
                          >
                            <SearchResultItem
                              title={city.name}
                              query={trimmed}
                              icon={<Building2 className="h-4 w-4" />}
                              onSelect={() => navigateTo(city.href)}
                            />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    {results.external.length > 0 ? (
                      <Command.Group heading="Discover">
                        {results.external.map((ext: ExternalPlaceSuggestion) => (
                          <Command.Item
                            key={ext.externalId}
                            value={`ext-${ext.externalId}`}
                            onSelect={() => openPreview(ext)}
                            className="rounded-lg"
                          >
                            <SearchResultItem
                              title={ext.name}
                              subtitle={ext.address}
                              query={trimmed}
                              badge="Add to SideQuest"
                              icon={<Globe2 className="h-4 w-4" />}
                              onSelect={() => openPreview(ext)}
                            />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    {!loading &&
                    results.places.length === 0 &&
                    results.collections.length === 0 &&
                    results.cities.length === 0 &&
                    results.external.length === 0 ? (
                      <Command.Empty className="py-8 text-center text-sm text-muted/50">
                        No results found
                      </Command.Empty>
                    ) : null}
                  </>
                ) : null}
              </Command.List>
            </Command>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SearchTriggerButton() {
  const { setOpen } = useSearchContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center gap-2 rounded-xl border border-border/25 bg-background/30 px-3 py-2 text-left text-sm text-muted/50 transition-colors hover:border-border/40 hover:text-muted/70"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1">Search places, collections…</span>
      <kbd className="hidden rounded border border-border/30 px-1.5 py-0.5 text-[10px] sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
