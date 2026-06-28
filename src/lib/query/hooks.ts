"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation, type UseQueryResult } from "@tanstack/react-query";
import type { ExplorePageDTO } from "@/lib/cms/types";
import type { Profile } from "@/lib/db/types";
import {
  QUERY_GC_TIME_MS,
  QUERY_RETRY_COUNT,
  QUERY_STALE_TIME_MS,
  RECENT_PLACES_LIMIT,
} from "@/lib/query/constants";
import {
  fetchCollectionDetail,
  fetchCollections,
  fetchExploreCollections,
  fetchExplorePage,
  fetchPlaceDetail,
  fetchProfile,
  fetchRecentPlaces,
  fetchSearchResults,
  fetchSearchSuggest,
  createPlace,
  createCollection,
  type ClientProfile,
} from "@/lib/query/fetchers";
import {
  clearAuthQueryCache,
  invalidateAfterAddPlace,
  invalidateAfterCreateCollection,
  invalidateAfterDeleteCollection,
  invalidateAfterLogin,
  invalidateAfterRemovePlace,
  invalidateAfterPlaceUpdate,
  invalidateAfterPublishExplore,
  invalidateAfterUpdateCollection,
  invalidateAfterUpload,
} from "@/lib/query/invalidation";
import { recordQueryCacheHit, recordQueryCacheMiss } from "@/lib/query/observability";
import { queryKeys } from "@/lib/query/keys";

const queryDefaults = {
  staleTime: QUERY_STALE_TIME_MS,
  gcTime: QUERY_GC_TIME_MS,
  retry: QUERY_RETRY_COUNT,
} as const;

export function clientProfileToProfile(client: ClientProfile): Profile {
  return {
    id: client.id,
    auth_user_id: "",
    username: client.username,
    display_name: client.displayName,
    email: client.email,
    avatar_url: client.avatarUrl,
    role: client.role ?? "user",
  };
}

function useCacheTelemetry<T>(result: UseQueryResult<T, Error>, label: string) {
  const telemetryRef = useRef<"none" | "miss" | "hit">("none");

  useEffect(() => {
    if (result.isPending && result.fetchStatus === "fetching" && telemetryRef.current === "none") {
      recordQueryCacheMiss(label);
      telemetryRef.current = "miss";
    }

    if (result.data !== undefined && result.dataUpdatedAt > 0 && telemetryRef.current !== "hit") {
      if (!result.isPending || result.isFetching) {
        const age = Date.now() - result.dataUpdatedAt;
        const background = Boolean(result.data) && result.isFetching;
        recordQueryCacheHit(label, Math.max(age, 0), background);
        telemetryRef.current = "hit";
      }
    }
  }, [label, result.data, result.dataUpdatedAt, result.fetchStatus, result.isFetching, result.isPending]);
}

export function useProfileQuery() {
  const query = useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ client, queryKey }) => {
      const kind = client.getQueryData(queryKey) !== undefined ? "background" : "initial";
      return fetchProfile(kind);
    },
    meta: { label: "Profile" },
    ...queryDefaults,
  });

  useCacheTelemetry(query, "Profile");
  return query;
}

export function useCollectionsQuery(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.collections,
    queryFn: ({ client, queryKey }) => {
      const kind = client.getQueryData(queryKey) !== undefined ? "background" : "initial";
      return fetchCollections(kind);
    },
    enabled,
    meta: { label: "Collections" },
    ...queryDefaults,
  });

  useCacheTelemetry(query, "Collections");
  return query;
}

export function useRecentPlacesQuery(enabled = true, limit = RECENT_PLACES_LIMIT) {
  const query = useQuery({
    queryKey: queryKeys.recentPlaces(limit),
    queryFn: ({ client, queryKey }) => {
      const kind = client.getQueryData(queryKey) !== undefined ? "background" : "initial";
      return fetchRecentPlaces(limit, kind);
    },
    enabled,
    meta: { label: "Recent Places" },
    ...queryDefaults,
  });

  useCacheTelemetry(query, "Recent Places");
  return query;
}

export function useExplorePageQuery(
  initialData?: ExplorePageDTO | null,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const query = useQuery({
    queryKey: queryKeys.explorePage,
    queryFn: ({ client, queryKey }) => {
      const kind = client.getQueryData(queryKey) !== undefined ? "background" : "initial";
      return fetchExplorePage(kind);
    },
    initialData: initialData ?? undefined,
    enabled,
    meta: { label: "Explore Page" },
    ...queryDefaults,
  });

  useCacheTelemetry(query, "Explore Page");
  return query;
}

export function useExploreQuery() {
  const query = useQuery({
    queryKey: queryKeys.explore,
    queryFn: ({ client, queryKey }) => {
      const kind = client.getQueryData(queryKey) !== undefined ? "background" : "initial";
      return fetchExploreCollections(kind);
    },
    meta: { label: "Explore" },
    ...queryDefaults,
  });

  useCacheTelemetry(query, "Explore");
  return query;
}

export function useCollectionDetailQuery(collectionId: string) {
  const query = useQuery({
    queryKey: queryKeys.collection(collectionId),
    queryFn: ({ client, queryKey }) => {
      const kind = client.getQueryData(queryKey) !== undefined ? "background" : "initial";
      return fetchCollectionDetail(collectionId, kind);
    },
    meta: { label: "Collection" },
    ...queryDefaults,
  });

  useCacheTelemetry(query, "Collection");
  return query;
}

export function usePlaceQuery(placeId: string) {
  const query = useQuery({
    queryKey: queryKeys.place(placeId),
    queryFn: ({ client, queryKey }) => {
      const kind = client.getQueryData(queryKey) !== undefined ? "background" : "initial";
      return fetchPlaceDetail(placeId, kind);
    },
    meta: { label: "Place" },
    ...queryDefaults,
  });

  useCacheTelemetry(query, "Place");
  return query;
}

export function useSearchQuery(q: string) {
  const trimmed = q.trim();
  const query = useQuery({
    queryKey: queryKeys.search(trimmed),
    queryFn: ({ client, queryKey }) => {
      const kind = client.getQueryData(queryKey) !== undefined ? "background" : "initial";
      return fetchSearchResults(trimmed, kind);
    },
    enabled: trimmed.length > 0,
    meta: { label: "Search" },
    ...queryDefaults,
  });

  useCacheTelemetry(query, "Search");
  return query;
}

const SUGGEST_STALE_MS = 30_000;

export function useSearchSuggest(
  q: string,
  options: {
    sessionToken: string;
    lat?: number;
    lng?: number;
    enabled?: boolean;
    hero?: boolean;
  }
) {
  const [debouncedQ, setDebouncedQ] = useState(q);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(timer);
  }, [q]);

  const trimmed = debouncedQ.trim();
  const enabled = (options.enabled ?? true) && trimmed.length > 0 && Boolean(options.sessionToken);

  return useQuery({
    queryKey: queryKeys.searchSuggest(trimmed, options.sessionToken),
    queryFn: async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      return fetchSearchSuggest(
        {
          q: trimmed,
          sessionToken: options.sessionToken,
          lat: options.lat,
          lng: options.lng,
          hero: options.hero,
        },
        abortRef.current.signal
      );
    },
    enabled,
    staleTime: SUGGEST_STALE_MS,
    gcTime: QUERY_GC_TIME_MS,
    retry: 1,
    meta: { label: "Search Suggest" },
  });
}

export function useAddPlaceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPlace,
    onSuccess: (_data, variables) => {
      invalidateAfterAddPlace(queryClient, variables.collectionId);
    },
  });
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      invalidateAfterCreateCollection(queryClient);
    },
  });
}

export function useQueryInvalidation() {
  const queryClient = useQueryClient();

  return {
    afterUpload: () => invalidateAfterUpload(queryClient),
    afterCreateCollection: () => invalidateAfterCreateCollection(queryClient),
    afterDeleteCollection: () => invalidateAfterDeleteCollection(queryClient),
    afterUpdateCollection: (collectionId?: string) =>
      invalidateAfterUpdateCollection(queryClient, collectionId),
    afterAddPlace: (collectionId?: string) => invalidateAfterAddPlace(queryClient, collectionId),
    afterRemovePlace: (collectionId?: string) => invalidateAfterRemovePlace(queryClient, collectionId),
    afterPlaceUpdate: (placeId: string) => invalidateAfterPlaceUpdate(queryClient, placeId),
    afterPublishExplore: () => invalidateAfterPublishExplore(queryClient),
    afterLogin: () => invalidateAfterLogin(queryClient),
    afterLogout: () => clearAuthQueryCache(queryClient),
  };
}
