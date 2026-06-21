"use client";

import { parseApiJson } from "@/lib/api/response";

import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface CoverUploadButtonProps {
  collectionId: string;
  className?: string;
  compact?: boolean;
}

export function CoverUploadButton({ collectionId, className, compact }: CoverUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/collections/${collectionId}/cover`, {
        method: "POST",
        body: formData,
      });
      const json = await parseApiJson(res);

      if (!res.ok) throw new Error(json.error?.message ?? "Upload failed");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        aria-label="Set cover image"
        className={cn(
          "flex shrink-0 items-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:border-white/35 hover:bg-black/55 hover:text-white disabled:opacity-50",
          compact ? "p-2" : "gap-1.5 px-3 py-1.5 text-xs"
        )}
      >
        {loading ? (
          <Loader2 className={cn("animate-spin", compact ? "h-4 w-4" : "h-3.5 w-3.5")} />
        ) : (
          <ImagePlus className={cn(compact ? "h-4 w-4" : "h-3.5 w-3.5")} />
        )}
        {!compact && (loading ? "Uploading…" : "Set cover")}
      </button>

      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
