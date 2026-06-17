"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisibilityToggleProps {
  collectionId: string;
  isPublic: boolean;
}

export function VisibilityToggle({ collectionId, isPublic: initial }: VisibilityToggleProps) {
  const router = useRouter();
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
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-sm transition-colors",
        isPublic
          ? "border-primary/40 bg-primary/20 text-primary"
          : "border-white/20 bg-black/40 text-white/80"
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isPublic ? (
        <Globe className="h-3 w-3" />
      ) : (
        <Lock className="h-3 w-3" />
      )}
      {isPublic ? "Public" : "Private"}
    </button>
  );
}
