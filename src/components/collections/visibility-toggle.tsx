"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Lock, Loader2 } from "lucide-react";
import { useQueryInvalidation } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";

interface VisibilityToggleProps {
  collectionId: string;
  isPublic: boolean;
  compact?: boolean;
}

export function VisibilityToggle({ collectionId, isPublic: initial, compact }: VisibilityToggleProps) {
  const { afterUpdateCollection } = useQueryInvalidation();
  const [isPublic, setIsPublic] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !isPublic;

    const res = await fetch(`/api/collections/${collectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });

    if (res.ok) {
      setIsPublic(next);
      afterUpdateCollection(collectionId);
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={isPublic ? "Public collection" : "Private collection"}
      className={cn(
        "flex shrink-0 items-center rounded-full border backdrop-blur-sm transition-colors",
        compact ? "gap-0 p-2" : "gap-1.5 px-3 py-1 text-[11px] font-medium",
        isPublic
          ? "border-primary/40 bg-primary/20 text-primary"
          : "border-white/20 bg-black/40 text-white/80"
      )}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin", compact ? "h-4 w-4" : "h-3 w-3")} />
      ) : isPublic ? (
        <Globe className={cn(compact ? "h-4 w-4" : "h-3 w-3")} />
      ) : (
        <Lock className={cn(compact ? "h-4 w-4" : "h-3 w-3")} />
      )}
      {!compact && (isPublic ? "Public" : "Private")}
    </button>
  );
}
