import { getSearchConfig } from "@/lib/search/config";
import type { PlaceTier } from "@/lib/search/types";

export interface EnrichmentContext {
  saveCount: number;
  popularityScore: number;
  placeTier: PlaceTier;
  isEditorial?: boolean;
  isFeatured?: boolean;
  searchEnriched?: boolean;
  hasCoverPhoto?: boolean;
}

export function shouldEnqueueEnrichment(
  place: EnrichmentContext
): { enqueue: boolean; reason: string | null } {
  const { enrichSaveThreshold, enrichPopularityThreshold } = getSearchConfig();

  if (place.placeTier === "full" && place.searchEnriched && place.hasCoverPhoto) {
    return { enqueue: false, reason: null };
  }

  if (place.isEditorial || place.isFeatured) {
    return { enqueue: true, reason: "editorial" };
  }

  if (place.popularityScore >= enrichPopularityThreshold) {
    return { enqueue: true, reason: "popularity_threshold" };
  }

  if (place.saveCount >= enrichSaveThreshold) {
    return { enqueue: true, reason: "save_threshold" };
  }

  return { enqueue: false, reason: null };
}
