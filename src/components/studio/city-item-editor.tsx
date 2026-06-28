"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import type { CmsSectionItemRow } from "@/lib/cms/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseApiJson } from "@/lib/api/response";
import { resolveAssetUrl } from "@/lib/images/assets";
import { cn } from "@/lib/utils";

interface CityItemEditorProps {
  item: CmsSectionItemRow;
  sectionId: string;
  revisionId: string;
  disabled?: boolean;
  onItemPatched: (item: CmsSectionItemRow) => void;
}

function citySlug(label: string, itemId: string): string {
  const fromLabel = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return fromLabel || itemId.slice(0, 8);
}

export function CityItemEditor({
  item,
  sectionId,
  revisionId,
  disabled,
  onItemPatched,
}: CityItemEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOverride, setPreviewOverride] = useState<string | null>(null);

  const previewUrl =
    previewOverride ?? (item.image_key ? resolveAssetUrl(item.image_key) : null);

  useEffect(() => {
    setPreviewOverride(null);
  }, [item.image_key]);

  async function patchItem(patch: {
    label?: string;
    imageKey?: string;
    href?: string;
  }): Promise<CmsSectionItemRow> {
    const res = await fetch(
      `/api/studio/explore/sections/${sectionId}/items?itemId=${item.id}`,
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, item: patch }),
      }
    );
    const json = await parseApiJson<CmsSectionItemRow>(res);
    if (!res.ok) throw new Error(json.error?.message ?? "Failed to update city");
    const updated = json.data;
    if (!updated) throw new Error("Failed to update city");
    onItemPatched(updated);
    return updated;
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("slug", citySlug(item.label ?? "city", item.id));
      form.append("version", "1");
      form.append("folder", "city_assets");

      const res = await fetch("/api/studio/images/upload", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const json = await parseApiJson<{ key: string }>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Upload failed");

      const key = json.data?.key;
      if (!key) throw new Error("Upload did not return a storage key");

      const preview = resolveAssetUrl(key);
      if (preview) setPreviewOverride(preview);

      await patchItem({ imageKey: key });
    } catch (err) {
      setPreviewOverride(null);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border/25 bg-background/40",
          !disabled && "hover:border-border/50"
        )}
      >
        {previewUrl ? (
          <Image src={previewUrl} alt="" fill className="object-cover" sizes="56px" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted/35">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </span>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageUpload(file);
        }}
      />

      <Input
        key={`${item.id}-label-${item.label ?? ""}`}
        defaultValue={item.label ?? ""}
        disabled={disabled}
        placeholder="City name"
        className="max-w-[140px] bg-background/40"
        onBlur={(e) => {
          const value = e.target.value.trim();
          if (value && value !== (item.label ?? "")) {
            void patchItem({ label: value }).catch((err) =>
              setError(err instanceof Error ? err.message : "Save failed")
            );
          }
        }}
      />
      <Input
        key={`${item.id}-href-${item.href ?? ""}`}
        defaultValue={item.href ?? ""}
        disabled={disabled}
        placeholder="Link (e.g. /explore?city=london)"
        className="min-w-[180px] flex-1 bg-background/40"
        onBlur={(e) => {
          const value = e.target.value.trim();
          if (value !== (item.href ?? "")) {
            void patchItem({ href: value || "#" }).catch((err) =>
              setError(err instanceof Error ? err.message : "Save failed")
            );
          }
        }}
      />

      {!disabled ? (
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
      ) : null}

      {error ? <p className="w-full text-xs text-secondary">{error}</p> : null}
    </div>
  );
}
