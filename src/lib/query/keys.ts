/**
 * Central query key registry — extend here for future caches
 * (explore, collection detail, recommendations, friends, stats, nearby).
 */
export const queryKeys = {
  profile: ["profile"] as const,
  collections: ["collections"] as const,
  recentPlaces: (limit = 12) => ["recentPlaces", { limit }] as const,
  explore: ["explore"] as const,
  explorePage: ["explore", "page"] as const,
  collection: (collectionId: string) => ["collection", collectionId] as const,
  place: (placeId: string) => ["place", placeId] as const,
  search: (q: string) => ["search", { q }] as const,
  recommendations: ["recommendations"] as const,
  friends: ["friends"] as const,
  stats: ["stats"] as const,
  nearby: (lat?: number, lng?: number) => ["nearby", { lat, lng }] as const,
} as const;

export type QueryKeyName = keyof typeof queryKeys;
