import type { MapPlace } from "@/lib/map/types";

export interface RandomPlaceOptions {
  /** Prefer unvisited places when available */
  preferUnvisited?: boolean;
}

/**
 * Pick a random place from visible map results.
 * Signature ready for V2 weighting (AI scores, time of day, etc.).
 */
export function pickRandomMapPlace(
  places: MapPlace[],
  options: RandomPlaceOptions = {}
): MapPlace | null {
  const { preferUnvisited = true } = options;
  if (places.length === 0) return null;

  const withCoords = places.filter(
    (p) => p.latitude != null && p.longitude != null
  );
  if (withCoords.length === 0) return null;

  if (preferUnvisited) {
    const unvisited = withCoords.filter((p) => p.visitStatus === "saved");
    if (unvisited.length > 0) {
      return unvisited[Math.floor(Math.random() * unvisited.length)];
    }
  }

  return withCoords[Math.floor(Math.random() * withCoords.length)];
}
