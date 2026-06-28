"use client";

import { parseApiJson } from "@/lib/api/response";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryInvalidation } from "@/lib/query/hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
}

export function CsvImportDialog({ open, onOpenChange, onBack }: CsvImportDialogProps) {
  const router = useRouter();
  const { afterUpload } = useQueryInvalidation();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function resetForm() {
    setFile(null);
    setCoverImage(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setCollectionName("");
    setDescription("");
    setError(null);
    setStatus(null);
  }

  function handleCoverSelect(selected: File | null) {
    setCoverImage(selected);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);
    if (collectionName.trim()) formData.append("collectionName", collectionName.trim());
    if (description.trim()) formData.append("description", description.trim());
    if (coverImage) formData.append("coverImage", coverImage);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const json = await parseApiJson<{ jobId: string }>(res);

      if (!res.ok) {
        throw new Error(json.error?.message ?? "Import failed");
      }

      const jobId = json.data?.jobId;
      if (!jobId) throw new Error("Import failed");
      setStatus("Importing places...");

      const poll = async () => {
        const statusRes = await fetch(`/api/import/${jobId}`);
        const statusJson = await parseApiJson<{
          status: string;
          collectionId?: string;
          errorMessage?: string;
        }>(statusRes);
        const job = statusJson.data;
        if (!job) throw new Error("Import status unavailable");

        if (job.status === "completed") {
          setStatus("Done! Refreshing...");
          onOpenChange(false);
          resetForm();
          afterUpload();
          if (job.collectionId) router.push(`/collections/${job.collectionId}`);
          return;
        }

        if (job.status === "enriching_photos") {
          setStatus("Fetching place photos...");
        } else if (job.status === "importing") {
          setStatus("Importing places...");
        }

        if (job.status === "failed") {
          throw new Error(job.errorMessage ?? "Import failed");
        }

        setTimeout(poll, 2000);
      };

      await poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Google Maps</DialogTitle>
          <DialogDescription>
            Upload a Google Takeout CSV export. We&apos;ll create a collection and import your saved
            places.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-muted/60 hover:text-foreground"
            >
              ← Back to create collection
            </button>
          ) : null}

          <div>
            <label className="mb-1 block text-xs text-muted">CSV file</label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !collectionName) {
                  setCollectionName(f.name.replace(/\.csv$/i, "").replace(/[-_]/g, " "));
                }
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Collection name</label>
            <Input
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="Goa Hidden Gems"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hidden beaches, local cafes, sunset spots..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Cover image (optional)</label>
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
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border/60 bg-card/40 p-3 text-left transition-colors hover:border-primary/30"
            >
              {coverPreview ? (
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                  <Image src={coverPreview} alt="Cover preview" fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-card">
                  <ImagePlus className="h-5 w-5 text-muted" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">
                  {coverImage ? coverImage.name : "Upload collection cover"}
                </p>
                <p className="text-xs text-muted">JPEG, PNG, or WebP · max 5 MB</p>
              </div>
            </button>
            {coverImage ? (
              <button
                type="button"
                onClick={() => handleCoverSelect(null)}
                className="mt-1 text-xs text-muted hover:text-foreground"
              >
                Remove cover image
              </button>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {status ? <p className="text-sm text-primary">{status}</p> : null}

          <Button onClick={() => void handleUpload()} disabled={loading} className="w-full">
            {loading ? "Processing…" : "Import collection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
