import type { QueryClient } from "@tanstack/react-query";
import { recordQueryInvalidation } from "@/lib/query/observability";
import { queryKeys } from "@/lib/query/keys";

function invalidate(
  queryClient: QueryClient,
  keys: string[],
  reason: string,
  filters: { queryKey: readonly unknown[] }[]
) {
  recordQueryInvalidation(keys, reason);
  for (const filter of filters) {
    void queryClient.invalidateQueries(filter);
  }
}

const HOME_KEYS = [
  { queryKey: queryKeys.collections },
  { queryKey: queryKeys.explore },
  { queryKey: queryKeys.explorePage },
  { queryKey: ["recentPlaces"] as const },
];

/** After CSV import or cover upload on home. */
export function invalidateAfterUpload(queryClient: QueryClient) {
  invalidate(queryClient, ["collections", "recentPlaces", "explore"], "upload", HOME_KEYS);
}

/** New collection created. */
export function invalidateAfterCreateCollection(queryClient: QueryClient) {
  invalidate(queryClient, ["collections", "explore"], "create-collection", [
    { queryKey: queryKeys.collections },
    { queryKey: queryKeys.explore },
    { queryKey: queryKeys.explorePage },
  ]);
}

/** Collection deleted. */
export function invalidateAfterDeleteCollection(queryClient: QueryClient) {
  invalidate(queryClient, ["collections", "recentPlaces", "explore"], "delete-collection", HOME_KEYS);
}

/** Collection renamed or visibility toggled. */
export function invalidateAfterUpdateCollection(queryClient: QueryClient, collectionId?: string) {
  const keys = collectionId
    ? ["collections", "explore", `collection:${collectionId}`]
    : ["collections", "explore"];
  invalidate(queryClient, keys, "update-collection", [
    { queryKey: queryKeys.collections },
    { queryKey: queryKeys.explore },
    { queryKey: queryKeys.explorePage },
    ...(collectionId ? [{ queryKey: queryKeys.collection(collectionId) }] : []),
  ]);
}

/** Place added to a collection. */
export function invalidateAfterAddPlace(queryClient: QueryClient, collectionId?: string) {
  const keys = [
    "collections",
    "recentPlaces",
    "explore",
    ...(collectionId ? [`collection:${collectionId}`] : []),
  ];
  invalidate(queryClient, keys, "add-place", [
    ...HOME_KEYS,
    ...(collectionId ? [{ queryKey: queryKeys.collection(collectionId) }] : []),
  ]);
}

/** Place removed from a collection. */
export function invalidateAfterRemovePlace(queryClient: QueryClient, collectionId?: string) {
  invalidate(queryClient, keysForRemove(collectionId), "remove-place", [
    ...HOME_KEYS,
    ...(collectionId ? [{ queryKey: queryKeys.collection(collectionId) }] : []),
  ]);
}

/** Place enriched or updated. */
export function invalidateAfterPlaceUpdate(queryClient: QueryClient, placeId: string) {
  invalidate(queryClient, [`place:${placeId}`, "recentPlaces"], "place-update", [
    { queryKey: queryKeys.place(placeId) },
    { queryKey: ["recentPlaces"] },
  ]);
}

function keysForRemove(collectionId?: string) {
  return collectionId
    ? ["collections", "recentPlaces", "explore", `collection:${collectionId}`]
    : ["collections", "recentPlaces", "explore"];
}

/** Sign-in — refresh profile and cached lists. */
export function invalidateAfterLogin(queryClient: QueryClient) {
  invalidate(
    queryClient,
    ["profile", "collections", "recentPlaces", "explore"],
    "login",
    [{ queryKey: queryKeys.profile }, ...HOME_KEYS]
  );
}

/** Sign-out — drop all cached user data. */
export function clearAuthQueryCache(queryClient: QueryClient) {
  recordQueryInvalidation(
    ["profile", "collections", "recentPlaces", "explore", "collection", "place", "search"],
    "logout"
  );
  queryClient.removeQueries({ queryKey: queryKeys.profile });
  queryClient.removeQueries({ queryKey: queryKeys.collections });
  queryClient.removeQueries({ queryKey: queryKeys.explore });
  queryClient.removeQueries({ queryKey: queryKeys.explorePage });
  queryClient.removeQueries({ queryKey: ["recentPlaces"] });
  queryClient.removeQueries({ queryKey: ["collection"] });
  queryClient.removeQueries({ queryKey: ["place"] });
  queryClient.removeQueries({ queryKey: ["search"] });
}
