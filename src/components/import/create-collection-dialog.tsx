"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CsvImportDialog } from "@/components/import/csv-import-dialog";
import { parseApiJson } from "@/lib/api/response";
import { resolveAssetUrl } from "@/lib/images/assets";
import { useCreateCollectionMutation } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";

interface CoverSuggestion {
  key: string;
  url?: string;
}

function coverImageSrc(suggestion: CoverSuggestion): string {
  return suggestion.url ?? resolveAssetUrl(suggestion.key) ?? `/cdn/${suggestion.key}`;
}

function CoverSuggestionTile({
  suggestion,
  index,
  selected,
  onSelect,
}: {
  suggestion: CoverSuggestion;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [src, setSrc] = useState(() => coverImageSrc(suggestion));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(coverImageSrc(suggestion));
    setFailed(false);
  }, [suggestion.key, suggestion.url]);

  function handleError() {
    const cdn = `/cdn/${suggestion.key}`;
    if (src !== cdn) {
      setSrc(cdn);
      return;
    }
    setFailed(true);
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative h-28 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border/20 hover:border-border/40"
      )}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="block h-full w-full object-cover"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleError}
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-teal-900/60 via-slate-800 to-amber-900/40" />
      )}
    </button>
  );
}

interface CreateCollectionDialogProps {
  trigger: React.ReactNode;
}

export function CreateCollectionDialog({ trigger }: CreateCollectionDialogProps) {
  const createMutation = useCreateCollectionMutation();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedCoverKey, setSelectedCoverKey] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CoverSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (name.trim()) params.set("name", name.trim());
      if (description.trim()) params.set("description", description.trim());
      const res = await fetch(`/api/collections/cover-suggestions?${params}`, {
        credentials: "same-origin",
      });
      const json = await parseApiJson<CoverSuggestion[]>(res);
      if (res.ok && Array.isArray(json.data) && json.data.length > 0) {
        setSuggestions(json.data);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [name, description]);

  useEffect(() => {
    if (!open || coverFile) return;
    void loadSuggestions();
    const timer = window.setTimeout(() => void loadSuggestions(), 600);
    return () => window.clearTimeout(timer);
  }, [open, coverFile, name, description, loadSuggestions]);

  function resetForm() {
    setName("");
    setDescription("");
    setTagsInput("");
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setSelectedCoverKey(null);
    setSuggestions([]);
    setError(null);
  }

  function handleCoverFile(file: File | null) {
    setCoverFile(file);
    setSelectedCoverKey(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  function parseTags(raw: string): string[] {
    return raw
      .split(/[,#]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Collection name is required");
      return;
    }

    setError(null);

    try {
      const tags = parseTags(tagsInput);
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        tags,
        coverFile: coverFile ?? undefined,
        coverKey: !coverFile ? selectedCoverKey ?? undefined : undefined,
      });

      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection");
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a new collection</DialogTitle>
            <DialogDescription>
              Name your list, add a cover, then search and save places as you explore.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tokyo coffee crawl"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Neighborhood spots, late-night ramen, quiet temples…"
                rows={3}
                className="w-full resize-none rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/15"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted">Tags (optional)</label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="coffee, nightlife, budget — comma separated"
              />
              <p className="mt-1 text-[11px] text-muted/45">
                Used for organization now; smart suggestions coming later.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs text-muted">Cover image</label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleCoverFile(e.target.files?.[0] ?? null)}
              />

              {coverPreview ? (
                <div className="space-y-2">
                  <div className="relative h-36 w-full overflow-hidden rounded-xl border border-border/30">
                    <Image src={coverPreview} alt="Cover preview" fill className="object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCoverFile(null)}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Remove uploaded image
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border/60 bg-card/40 p-3 text-left transition-colors hover:border-primary/30"
                  >
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-card">
                      <ImagePlus className="h-5 w-5 text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Upload your own</p>
                      <p className="text-xs text-muted">JPEG, PNG, or WebP</p>
                    </div>
                  </button>

                  <p className="my-3 text-center text-[11px] text-muted/45">
                    or pick a suggestion based on your collection
                  </p>

                  <div className="flex justify-center gap-2">
                    {suggestionsLoading && suggestions.length === 0
                      ? Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-28 w-16 animate-pulse rounded-xl bg-card/50"
                          />
                        ))
                      : suggestions.length === 0 ? (
                          <p className="py-2 text-center text-[11px] text-muted/45">
                            Upload a cover above — suggestions load from your image library
                          </p>
                        ) : (
                          suggestions.map((s, index) => (
                            <CoverSuggestionTile
                              key={`${s.key}-${index}`}
                              suggestion={s}
                              index={index}
                              selected={selectedCoverKey === s.key}
                              onSelect={() => {
                                setSelectedCoverKey(s.key);
                                setCoverFile(null);
                              }}
                            />
                          ))
                        )}
                  </div>
                </>
              )}
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <Button
              onClick={() => void handleCreate()}
              disabled={createMutation.isPending || !name.trim()}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              {createMutation.isPending ? "Creating…" : "Create collection"}
            </Button>

            <p className="text-center text-xs text-muted/50">
              Have a Google Maps export?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  setOpen(false);
                  setCsvOpen(true);
                }}
              >
                Import from CSV
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onBack={() => {
          setCsvOpen(false);
          setOpen(true);
        }}
      />
    </>
  );
}

/** @deprecated Use CreateCollectionDialog */
export { CreateCollectionDialog as UploadDialog };
