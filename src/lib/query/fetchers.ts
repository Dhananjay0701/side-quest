import { parseApiJson } from "@/lib/api/response";
import type { CollectionCard, PlaceCard } from "@/lib/db/types";
import { RECENT_PLACES_LIMIT } from "@/lib/query/constants";
import {
  recordQueryFetchEnd,
  recordQueryFetchStart,
} from "@/lib/query/observability";
import { queryKeys } from "@/lib/query/keys";

export interface ClientProfile {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface CollectionDetailPayload {
  collection: {
    id: string;
    name: string;
    description: string | null;
    placeCount: number;
    coverImageUrl: string | null;
    isPublic: boolean;
  };
  filters: {
    categories: { slug: string; name: string; count: number }[];
    tags: { slug: string; name: string; count: number }[];
  };
  isOwner: boolean;
}

export interface PlaceDetailPayload {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  coverImageUrl: string | null;
  googleMapsUrl: string;
  category: { slug: string; name: string } | null;
  tags: { slug: string; name: string }[];
  shortDescription: string | null;
  longDescription: string | null;
  interestingFacts: string[];
  importNotes: string | null;
  searchEnriched: boolean;
  enrichmentStatus: string;
  metadata: Record<string, unknown>;
  collections: { id: string; name: string }[];
  createdAt: string;
}

export interface SearchResultsPayload {
  collections: CollectionCard[];
  places: PlaceCard[];
}

async function fetchJson<T>(
  path: string,
  queryKey: readonly unknown[],
  label: string,
  kind: "initial" | "background"
): Promise<T> {
  const isLeader = recordQueryFetchStart(queryKey);
  const started = performance.now();

  try {
    const res = await fetch(path, { credentials: "same-origin" });
    const json = await parseApiJson<T>(res);
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Request failed (${res.status})`);
    }
    if (isLeader) {
      recordQueryFetchEnd(queryKey, label, performance.now() - started, kind);
    }
    return json.data as T;
  } catch (error) {
    if (isLeader) {
      recordQueryFetchEnd(queryKey, label, performance.now() - started, kind);
    }
    throw error;
  }
}

export async function fetchProfile(kind: "initial" | "background" = "initial") {
  return fetchJson<ClientProfile | null>("/api/me", queryKeys.profile, "Profile", kind);
}

export async function fetchCollections(kind: "initial" | "background" = "initial") {
  return fetchJson<CollectionCard[]>("/api/collections", queryKeys.collections, "Collections", kind);
}

export async function fetchRecentPlaces(
  limit = RECENT_PLACES_LIMIT,
  kind: "initial" | "background" = "initial"
) {
  const key = queryKeys.recentPlaces(limit);
  return fetchJson<PlaceCard[]>(
    `/api/places/recent?limit=${limit}`,
    key,
    "Recent Places",
    kind
  );
}

export async function fetchExploreCollections(kind: "initial" | "background" = "initial") {
  return fetchJson<CollectionCard[]>(
    "/api/explore",
    queryKeys.explore,
    "Explore",
    kind
  );
}

export async function fetchCollectionDetail(
  collectionId: string,
  kind: "initial" | "background" = "initial"
) {
  const key = queryKeys.collection(collectionId);
  return fetchJson<CollectionDetailPayload>(
    `/api/collections/${collectionId}`,
    key,
    "Collection",
    kind
  );
}

export async function fetchPlaceDetail(placeId: string, kind: "initial" | "background" = "initial") {
  const key = queryKeys.place(placeId);
  return fetchJson<PlaceDetailPayload>(`/api/places/${placeId}`, key, "Place", kind);
}

export async function fetchSearchResults(q: string, kind: "initial" | "background" = "initial") {
  const trimmed = q.trim();
  const key = queryKeys.search(trimmed);
  return fetchJson<SearchResultsPayload>(
    `/api/search?q=${encodeURIComponent(trimmed)}`,
    key,
    "Search",
    kind
  );
}
