import type { PlaceVisitStatus } from "@/lib/map/types";

/**
 * Derive visit status from place metadata.
 * V2: replace with `place_visits` table lookup.
 */
export function getVisitStatusFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): PlaceVisitStatus {
  if (!metadata) return "saved";
  if (metadata.visited === true) return "visited";
  if (metadata.visit_status === "visited") return "visited";
  return "saved";
}
