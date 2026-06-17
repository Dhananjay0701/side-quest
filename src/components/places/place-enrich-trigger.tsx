"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

interface PlaceEnrichTriggerProps {
  placeId: string;
  searchEnriched: boolean;
  enrichmentStatus: string;
  coverImageUrl: string | null;
}

export function PlaceEnrichTrigger({
  placeId,
  searchEnriched,
  enrichmentStatus,
  coverImageUrl,
}: PlaceEnrichTriggerProps) {
  const router = useRouter();
  const needsEnrichment = !searchEnriched || !coverImageUrl;
  const [status, setStatus] = useState<"idle" | "enriching" | "done" | "error">(
    needsEnrichment ? "idle" : "done"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!needsEnrichment) return;

    let cancelled = false;

    async function enrich() {
      setStatus("enriching");
      try {
        const res = await fetch(`/api/places/${placeId}`, { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Enrichment failed");
        if (cancelled) return;
        setStatus("done");
        router.refresh();
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Enrichment failed");
      }
    }

    enrich();
    return () => {
      cancelled = true;
    };
  }, [placeId, needsEnrichment, router]);

  if (searchEnriched && (coverImageUrl || status === "done")) {
    return (
      <div className="mt-8 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
        <Sparkles className="h-4 w-4" />
        Enriched with AI
      </div>
    );
  }

  if (status === "enriching" || enrichmentStatus === "processing") {
    return (
      <div className="mt-8 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {!searchEnriched ? "Enriching with AI..." : "Fetching place photo..."}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        Enrichment failed: {error}. Check GEMINI_API_KEY and refresh.
      </div>
    );
  }

  return null;
}
