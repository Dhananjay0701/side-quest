import type { PlaceCard } from "@/lib/db/types";

/** Visit logging — wire to DB in V2 */
export type PlaceVisitStatus = "saved" | "visited";

/** Place with map coordinates — extends card data for discovery map */
export interface MapPlace extends PlaceCard {
  latitude: number | null;
  longitude: number | null;
  visitStatus: PlaceVisitStatus;
}

export type NearbyRadiusKm = 1 | 5 | 10 | 20;

export type CollectionViewMode = "list" | "map";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Future V2 itinerary / route planning hooks */
export interface MapDiscoveryContext {
  collectionId: string;
  visiblePlaceIds: string[];
  filters: {
    query: string;
    category: string | null;
    tags: string[];
    nearbyRadiusKm: NearbyRadiusKm | null;
    userLocation: GeoPoint | null;
  };
}
