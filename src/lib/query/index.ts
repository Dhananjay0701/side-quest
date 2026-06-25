export { getQueryClient, getBrowserQueryClient, makeQueryClient } from "@/lib/query/client";
export {
  QUERY_GC_TIME_MS,
  QUERY_RETRY_COUNT,
  QUERY_STALE_TIME_MS,
  RECENT_PLACES_LIMIT,
} from "@/lib/query/constants";
export {
  fetchCollectionDetail,
  fetchCollections,
  fetchExploreCollections,
  fetchPlaceDetail,
  fetchProfile,
  fetchRecentPlaces,
  fetchSearchResults,
  type ClientProfile,
  type CollectionDetailPayload,
  type PlaceDetailPayload,
  type SearchResultsPayload,
} from "@/lib/query/fetchers";
export {
  clientProfileToProfile,
  useCollectionDetailQuery,
  useCollectionsQuery,
  useExploreQuery,
  usePlaceQuery,
  useProfileQuery,
  useQueryInvalidation,
  useRecentPlacesQuery,
  useSearchQuery,
} from "@/lib/query/hooks";
export {
  clearAuthQueryCache,
  invalidateAfterAddPlace,
  invalidateAfterCreateCollection,
  invalidateAfterDeleteCollection,
  invalidateAfterLogin,
  invalidateAfterPlaceUpdate,
  invalidateAfterRemovePlace,
  invalidateAfterUpdateCollection,
  invalidateAfterUpload,
} from "@/lib/query/invalidation";
export {
  averageCacheLifetimeMs,
  averageFetchTimeMs,
  getClientQueryCacheStats,
} from "@/lib/query/observability";
export { queryKeys } from "@/lib/query/keys";
