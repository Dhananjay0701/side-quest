"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ImagePlus, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseApiJson } from "@/lib/api/response";
import { useQueryInvalidation } from "@/lib/query/hooks";
import { imageCache } from "@/lib/images/cache";
import { cn } from "@/lib/utils";

interface CollectionResult {
  id: string;
  name: string;
  description: string;
  placeCount: number;
  coverImageUrl: string | null;
  isPublic: boolean;
  isOwned?: boolean;
}

function CoverThumbnail({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-background/50">
      <Image src={src} alt={alt} fill unoptimized className="object-cover" sizes="112px" />
    </div>
  );
}

export function CollectionCoverEditor() {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { afterUpdateCollection } = useQueryInvalidation();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CollectionResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CollectionResult | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const searchCollections = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/studio/collections/search?q=${encodeURIComponent(trimmed)}`,
        { credentials: "same-origin" }
      );
      const json = await parseApiJson<CollectionResult[]>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Search failed");
      const rows = json.data;
      setResults(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function selectCollection(collection: CollectionResult) {
    setSelected(collection);
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setError(null);
    setSuccess(null);
    setResults([]);
    setQuery(collection.name);
  }

  function clearSelection() {
    setSelected(null);
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setError(null);
    setSuccess(null);
  }

  function handleCoverSelect(file: File | null) {
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
    setSuccess(null);
  }

  async function handleUpload() {
    if (!selected) {
      setError("Search and select a collection first");
      return;
    }
    if (!coverFile) {
      setError("Choose an image to upload");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", coverFile);

    try {
      const res = await fetch(`/api/studio/collections/${selected.id}/cover`, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const json = await parseApiJson<{
        coverImageUrl?: string;
        collectionName?: string;
        storageBackend?: string;
        storageKey?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Upload failed");

      const coverUrl = json.data?.coverImageUrl ?? null;
      const updated: CollectionResult = {
        ...selected,
        coverImageUrl: coverUrl,
      };

      setSelected(updated);
      setCoverFile(null);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview(null);

      afterUpdateCollection(selected.id);
      if (coverUrl) void imageCache.refresh([coverUrl], "viewed");

      setSuccess(
        `Cover updated for “${json.data?.collectionName ?? selected.name}”` +
          (json.data?.storageBackend ? ` · stored via ${json.data.storageBackend}` : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const displayCover = coverPreview ?? selected?.coverImageUrl ?? null;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Collection covers</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted/55">
          Search for a collection by name, upload a cover image, and confirm the preview below.
        </p>
      </div>

      <section className="space-y-5 rounded-2xl border border-border/15 bg-card/25 p-5">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted/40">
            Search collection
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/35" />
            <Input
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                if (selected && value !== selected.name) clearSelection();
                void searchCollections(value);
              }}
              placeholder="Type at least 2 characters…"
              className="bg-background/40 pl-9"
            />
          </div>
        </div>

        {searching ? (
          <p className="flex items-center gap-2 text-xs text-muted/45">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
          </p>
        ) : null}

        {!searching && !selected && query.trim().length >= 2 && results.length > 0 ? (
          <ul className="space-y-2">
            {results.map((collection) => (
              <li key={collection.id}>
                <button
                  type="button"
                  onClick={() => selectCollection(collection)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/10 bg-background/20 px-3 py-2.5 text-left transition-colors hover:border-border/25"
                >
                  <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-background/50">
                    {collection.coverImageUrl ? (
                      <Image
                        src={collection.coverImageUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted/30">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{collection.name}</p>
                    <p className="truncate text-xs text-muted/45">
                      {collection.placeCount} places
                      {!collection.isPublic && collection.isOwned ? " · private" : ""}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!searching && !selected && query.trim().length >= 2 && results.length === 0 ? (
          <p className="text-xs text-muted/45">No collections found for “{query.trim()}”</p>
        ) : null}

        {selected ? (
          <div className="space-y-5 border-t border-border/10 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted/40">Selected</p>
                <h3 className="mt-1 text-lg font-semibold">{selected.name}</h3>
                <p className="mt-1 text-xs text-muted/45">{selected.placeCount} places</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-muted/55 hover:text-foreground"
                >
                  Change
                </button>
                <Link
                  href={`/collections/${selected.id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted/40">
                Cover image
              </label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleCoverSelect(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors",
                  displayCover
                    ? "border-border/30 bg-background/30 hover:border-primary/30"
                    : "border-border/50 bg-background/30 hover:border-primary/30"
                )}
              >
                {displayCover ? (
                  <CoverThumbnail src={displayCover} alt="Cover preview" />
                ) : (
                  <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-background/50">
                    <ImagePlus className="h-6 w-6 text-muted/40" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">
                    {coverFile ? coverFile.name : displayCover ? "Replace cover" : "Upload cover"}
                  </p>
                  <p className="text-xs text-muted/50">JPEG, PNG, or WebP · max 5 MB</p>
                </div>
              </button>
              {coverFile ? (
                <button
                  type="button"
                  onClick={() => handleCoverSelect(null)}
                  className="mt-2 text-xs text-muted/55 hover:text-foreground"
                >
                  Clear selected file
                </button>
              ) : null}
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {success ? <p className="text-sm text-primary">{success}</p> : null}

            <Button
              onClick={() => void handleUpload()}
              disabled={uploading || !coverFile}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                "Save cover image"
              )}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
