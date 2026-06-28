"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseApiJson } from "@/lib/api/response";

interface CollectionResult {
  id: string;
  name: string;
  description: string;
  placeCount: number;
  coverImageUrl: string | null;
  isPublic?: boolean;
  isOwned?: boolean;
}

interface CollectionPickerProps {
  onSelect: (collectionId: string, name: string) => void;
  onClose: () => void;
}

export function CollectionPicker({ onSelect, onClose }: CollectionPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CollectionResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(value: string) {
    setQuery(value);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/studio/collections/search?q=${encodeURIComponent(value)}`,
        { credentials: "same-origin" }
      );
      const json = await parseApiJson<CollectionResult[]>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Search failed");
      const rows = json.data;
      setResults(Array.isArray(rows) ? rows : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void search("");
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border/20 bg-[#0d1424] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Add collection</h3>
          <button type="button" onClick={onClose} className="text-muted/50 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Input
          value={query}
          onChange={(e) => void search(e.target.value)}
          placeholder="Search collections…"
          className="mb-4 bg-background/40"
          autoFocus
        />
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {loading ? <p className="text-xs text-muted/45">Searching…</p> : null}
          {results.map((collection) => (
            <button
              key={collection.id}
              type="button"
              onClick={() => onSelect(collection.id, collection.name)}
              className="flex w-full items-center gap-3 rounded-lg border border-border/10 bg-background/20 px-3 py-2 text-left hover:border-border/25"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{collection.name}</p>
                <p className="truncate text-xs text-muted/45">
                  {collection.placeCount} places
                  {collection.isOwned && !collection.isPublic ? " · private" : ""}
                  {collection.description ? ` · ${collection.description}` : ""}
                </p>
              </div>
            </button>
          ))}
          {!loading && results.length === 0 ? (
            <p className="text-xs text-muted/45">No collections found</p>
          ) : null}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
