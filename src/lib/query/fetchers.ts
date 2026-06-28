import type { ExplorePageDTO } from "@/lib/cms/types";
import type { ProfileRole } from "@/lib/auth/roles-edge";
import { parseApiJson } from "@/lib/api/response";
import type { CollectionCard, PlaceCard } from "@/lib/db/types";
import type { GroupedSearchResults, CreatePlaceResult } from "@/lib/search/types";
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
  role?: ProfileRole;
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
  cities?: { id: string; name: string; href: string; imageUrl: string | null }[];
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

export async function fetchExplorePage(kind: "initial" | "background" = "initial") {
  return fetchJson<ExplorePageDTO>(
    "/api/explore/page",
    queryKeys.explorePage,
    "Explore Page",
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

export async function fetchSearchSuggest(
  params: {
    q: string;
    sessionToken: string;
    lat?: number;
    lng?: number;
    hero?: boolean;
  },
  signal?: AbortSignal
): Promise<GroupedSearchResults> {
  const search = new URLSearchParams({
    q: params.q,
    sessionToken: params.sessionToken,
  });
  if (params.lat != null) search.set("lat", String(params.lat));
  if (params.lng != null) search.set("lng", String(params.lng));
  if (params.hero) search.set("hero", "true");

  const res = await fetch(`/api/search/suggest?${search.toString()}`, {
    credentials: "same-origin",
    signal,
  });
  const json = await parseApiJson<GroupedSearchResults>(res);
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Suggest failed (${res.status})`);
  }
  return json.data as GroupedSearchResults;
}

export async function createPlace(payload: {
  placeId?: string;
  external?: Record<string, unknown>;
  collectionId: string;
  sessionToken?: string;
}): Promise<CreatePlaceResult> {
  const res = await fetch("/api/places", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await parseApiJson<CreatePlaceResult>(res);
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Add place failed (${res.status})`);
  }
  return json.data as CreatePlaceResult;
}

export interface CreateCollectionResult {
  id: string;
  name: string;
  coverImageUrl: string | null;
}

export async function createCollection(payload: {
  name: string;
  description?: string;
  tags?: string[];
  coverFile?: File;
  coverKey?: string;
  isPublic?: boolean;
}): Promise<CreateCollectionResult> {
  const formData = new FormData();
  formData.append("name", payload.name);
  if (payload.description) formData.append("description", payload.description);
  if (payload.tags?.length) formData.append("tags", JSON.stringify(payload.tags));
  if (payload.coverKey) formData.append("coverKey", payload.coverKey);
  if (payload.coverFile) formData.append("coverImage", payload.coverFile);
  if (payload.isPublic) formData.append("isPublic", "true");

  const res = await fetch("/api/collections", {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  const json = await parseApiJson<CreateCollectionResult>(res);
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Create collection failed (${res.status})`);
  }
  return json.data as CreateCollectionResult;
}
