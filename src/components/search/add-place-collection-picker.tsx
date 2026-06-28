"use client";

import { useEffect, useState } from "react";
import { parseApiJson } from "@/lib/api/response";
import { resolveAssetUrl } from "@/lib/images/assets";
import { cn } from "@/lib/utils";

export interface CollectionPickerOption {
  id: string;
  name: string;
  description: string | null;
  placeCount: number;
  coverImageUrl: string | null;
  isPublic: boolean;
}

interface AddPlaceCollectionPickerProps {
  selectedId: string | null;
  onSelect: (id: string, name: string, coverImageUrl: string | null) => void;
  /** Pre-select a collection (e.g. when adding from collection detail page) */
  preferredCollectionId?: string;
  className?: string;
}

export function AddPlaceCollectionPicker({
  selectedId,
  onSelect,
  preferredCollectionId,
  className,
}: AddPlaceCollectionPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CollectionPickerOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/collections/mine/search?q=${encodeURIComponent(query)}`,
          { credentials: "same-origin" }
        );
        const json = await parseApiJson<CollectionPickerOption[]>(res);
        if (!cancelled) {
          setResults(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    if (selectedId || results.length === 0) return;

    const preferred = preferredCollectionId
      ? results.find((c) => c.id === preferredCollectionId)
      : null;
    const pick = preferred ?? (query.trim() ? null : results[0]);
    if (pick) {
      onSelect(pick.id, pick.name, pick.coverImageUrl);
    }
  }, [results, selectedId, preferredCollectionId, query, onSelect]);

  return (
    <div data-collection-picker className={cn("space-y-2", className)}>
      <label className="text-xs font-medium text-muted/70">Save to collection</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your collections…"
        className="w-full rounded-lg border border-border/20 bg-background/30 px-3 py-2 text-sm outline-none focus:border-border/40"
      />

      {/* Reserved for embedding-based collection suggestions */}
      <div data-suggestion-slot="collection-picker" className="hidden" aria-hidden />

      <div className="max-h-44 space-y-1 overflow-y-auto">
        {loading ? <p className="text-xs text-muted/45">Loading collections…</p> : null}
        {results.map((collection, index) => (
          <button
            key={collection.id}
            type="button"
            onClick={() => onSelect(collection.id, collection.name, collection.coverImageUrl)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              selectedId === collection.id
                ? "border-primary/40 bg-primary/10"
                : "border-border/10 bg-background/20 hover:border-border/25"
            )}
          >
            {collection.coverImageUrl ? (
              <img
                src={resolveAssetUrl(collection.coverImageUrl) ?? ""}
                alt=""
                className="h-9 w-7 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-9 w-7 shrink-0 rounded bg-background/40" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {collection.name}
                {index === 0 && !query.trim() ? (
                  <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-primary/80">
                    Recent
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted/45">
                {collection.placeCount} places
                {!collection.isPublic ? " · private" : ""}
              </p>
            </div>
          </button>
        ))}
        {!loading && results.length === 0 ? (
          <p className="text-xs text-muted/45">
            No collections yet — create one first, then come back to save this place.
          </p>
        ) : null}
      </div>
    </div>
  );
}
