import { createAdminClient } from "@/lib/supabase/admin";
import { profileDb } from "@/lib/debug/profiler";
import type {
  RpcCollectionFilterCounts,
  RpcRecentPlaceRow,
  RpcTopTagRow,
} from "@/lib/db/rpc-types";
import { resolveAssetUrl } from "@/lib/images/assets";
import { getVisitStatusFromMetadata } from "@/lib/map/visit-status";
import type { CollectionCard, PlaceCard } from "@/lib/db/types";

export function unwrapRelation<T>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

export function unwrapProfile(profiles: unknown): {
  display_name: string;
  avatar_url: string | null;
  username?: string;
} | null {
  return unwrapRelation(profiles);
}

const COLLECTION_CARD_SELECT =
  "id, name, description, place_count, cover_image_url, is_public, profiles(display_name, avatar_url, username)";

function buildCollectionCard(c: Record<string, unknown>, topTags: string[]): CollectionCard {
  const owner = unwrapProfile(c.profiles);
  return {
    id: c.id as string,
    name: c.name as string,
    description: c.description as string | null,
    placeCount: c.place_count as number,
    coverImageUrl: resolveAssetUrl(c.cover_image_url as string | null),
    isPublic: c.is_public as boolean,
    topTags,
    user: {
      displayName: owner?.display_name ?? "Traveler",
      avatarUrl: owner?.avatar_url ?? null,
      username: owner?.username,
    },
  };
}

/** One PostgreSQL round-trip — GROUP BY + window rank in DB (migration 007). */
export async function getCollectionsTopTagsMap(
  collectionIds: string[],
  limitPerCollection = 4
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>(collectionIds.map((id) => [id, []]));
  if (collectionIds.length === 0) return result;

  return profileDb("Collections Top Tags Query", async () => {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("get_collections_top_tags", {
      p_collection_ids: collectionIds,
      p_limit_per_collection: limitPerCollection,
    });

    if (error) throw error;

    for (const row of (data ?? []) as RpcTopTagRow[]) {
      const tags = result.get(row.collection_id) ?? [];
      tags.push(row.tag_name);
      result.set(row.collection_id, tags);
    }

    return result;
  });
}

async function mapCollectionRows(
  collections: Record<string, unknown>[]
): Promise<CollectionCard[]> {
  const ids = collections.map((c) => c.id as string);
  const topTagsMap = await getCollectionsTopTagsMap(ids, 4);

  return profileDb("Collections Mapping", async () =>
    collections.map((c) => buildCollectionCard(c, topTagsMap.get(c.id as string) ?? []))
  );
}

export function canAccessCollection(
  collection: { user_id: string; is_public: boolean },
  viewerProfileId?: string | null
): boolean {
  if (viewerProfileId && collection.user_id === viewerProfileId) return true;
  return collection.is_public;
}

export async function getMyCollections(profileId: string): Promise<CollectionCard[]> {
  return profileDb("My Collections Query", async () => {
    const supabase = createAdminClient();

    const { data: collections, error } = await supabase
      .from("collections")
      .select(COLLECTION_CARD_SELECT)
      .eq("user_id", profileId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    if (!collections?.length) return [];

    return mapCollectionRows(collections as Record<string, unknown>[]);
  });
}

export async function getPublicCollections(limit = 24): Promise<CollectionCard[]> {
  return profileDb("Public Collections Query", async () => {
    const supabase = createAdminClient();

    const { data: collections, error } = await supabase
      .from("collections")
      .select(COLLECTION_CARD_SELECT)
      .eq("is_public", true)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!collections?.length) return [];

    return mapCollectionRows(collections as Record<string, unknown>[]);
  });
}

/** @deprecated Use getMyCollections */
export async function getAllCollections(): Promise<CollectionCard[]> {
  return profileDb("All Collections Query", async () => {
    const supabase = createAdminClient();

    const { data: collections, error } = await supabase
      .from("collections")
      .select(COLLECTION_CARD_SELECT)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    if (!collections?.length) return [];

    return mapCollectionRows(collections as Record<string, unknown>[]);
  });
}

export async function getCollectionTopTags(collectionId: string, limit = 6): Promise<string[]> {
  const map = await getCollectionsTopTagsMap([collectionId], limit);
  return map.get(collectionId) ?? [];
}

export async function getCollectionById(id: string, viewerProfileId?: string | null) {
  return profileDb("Collection By Id Query", async () => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("collections")
      .select("id, user_id, name, description, place_count, cover_image_url, cover_source, is_public, is_deleted, source, created_at, updated_at, profiles(display_name, avatar_url, username)")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error) throw error;

    if (!canAccessCollection(data, viewerProfileId)) {
      throw new Error("Collection not found");
    }

    return data;
  });
}

export async function getCollectionFilters(collectionId: string) {
  return profileDb("Collection Filters Query", async () => {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("get_collection_filter_counts", {
      p_collection_id: collectionId,
    });

    if (error) throw error;

    const payload = (data ?? { categories: [], tags: [] }) as RpcCollectionFilterCounts;
    return {
      categories: payload.categories ?? [],
      tags: payload.tags ?? [],
    };
  });
}

function mapPlaceRow(row: Record<string, unknown>): PlaceCard {
  const category = unwrapRelation<{ slug: string; name: string }>(row.categories);
  const descRaw = row.place_descriptions;
  const desc = Array.isArray(descRaw)
    ? unwrapRelation<{ short_text: string | null }>(descRaw)
    : unwrapRelation<{ short_text: string | null }>(descRaw);
  const shortDesc = desc?.short_text ?? null;

  const tagRows = (row.place_tags as { tags: unknown }[] | null) ?? [];
  const tags = tagRows
    .map((t) => unwrapRelation<{ slug: string; name: string }>(t.tags))
    .filter((t): t is { slug: string; name: string } => Boolean(t));

  return {
    id: row.id as string,
    name: row.name as string,
    category: category ? { slug: category.slug, name: category.name } : null,
    tags,
    address: row.address as string | null,
    rating: row.rating as number | null,
    coverImageUrl: resolveAssetUrl(row.cover_image_url as string | null),
    shortDescription: shortDesc ?? null,
    googleMapsUrl: row.google_maps_url as string,
    likelyAudience: row.likely_audience as string | null,
    likelyVibe: row.likely_vibe as string | null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    visitStatus: getVisitStatusFromMetadata(row.metadata as Record<string, unknown> | null),
  };
}

function mapRecentPlaceFromRpc(row: RpcRecentPlaceRow): PlaceCard {
  return {
    id: row.id,
    name: row.name,
    category:
      row.category_slug && row.category_name
        ? { slug: row.category_slug, name: row.category_name }
        : null,
    tags: row.tags ?? [],
    address: row.address,
    rating: row.rating != null ? Number(row.rating) : null,
    coverImageUrl: resolveAssetUrl(row.cover_image_url),
    shortDescription: row.short_text,
    googleMapsUrl: row.google_maps_url,
    likelyAudience: row.likely_audience,
    likelyVibe: row.likely_vibe,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    visitStatus: getVisitStatusFromMetadata(row.metadata),
    collectionName: row.collection_name ?? undefined,
  };
}

const PLACE_LIST_SELECT = `id, name, address, rating, cover_image_url, google_maps_url, likely_audience, likely_vibe,
       latitude, longitude, metadata,
       categories(slug, name),
       place_descriptions(short_text),
       place_tags(tags(slug, name))`;

export async function getPlaces(params: {
  collectionId?: string;
  q?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ places: PlaceCard[]; total: number }> {
  return profileDb("Places Query", async () => {
    const supabase = createAdminClient();
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    let categoryId: string | null = null;
    if (params.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", params.category)
        .single();
      categoryId = cat?.id ?? null;
    }

    if (params.collectionId) {
      let query = supabase
        .from("places")
        .select(
          `id, name, address, rating, cover_image_url, google_maps_url, likely_audience, likely_vibe,
           latitude, longitude, metadata,
           categories(slug, name),
           place_descriptions(short_text),
           place_tags(tags(slug, name)),
           collection_places!inner(sort_order)`,
          { count: "exact" }
        )
        .eq("collection_places.collection_id", params.collectionId)
        .order("sort_order", { referencedTable: "collection_places", ascending: true });

      if (categoryId) query = query.eq("category_id", categoryId);
      if (params.q?.trim()) {
        query = query.textSearch("search_vector", params.q.trim(), {
          type: "websearch",
          config: "english",
        });
      }
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      let places = (data ?? []).map((row) => mapPlaceRow(row as Record<string, unknown>));
      if (params.tags?.length) {
        places = places.filter((place) => {
          const slugs = new Set(place.tags.map((t) => t.slug));
          return params.tags!.every((t) => slugs.has(t));
        });
      }

      return { places, total: count ?? places.length };
    }

    let query = supabase
      .from("places")
      .select(PLACE_LIST_SELECT, { count: "exact" })
      .order("name");

    if (categoryId) query = query.eq("category_id", categoryId);
    if (params.q?.trim()) {
      query = query.textSearch("search_vector", params.q.trim(), {
        type: "websearch",
        config: "english",
      });
    }
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    let places = (data ?? []).map((row) => mapPlaceRow(row as Record<string, unknown>));
    if (params.tags?.length) {
      places = places.filter((place) => {
        const slugs = new Set(place.tags.map((t) => t.slug));
        return params.tags!.every((t) => slugs.has(t));
      });
    }

    return { places, total: count ?? places.length };
  });
}

/** Single RPC round-trip — joins + aggregation in PostgreSQL (migration 008). */
export async function getRecentPlaces(profileId: string, limit = 12): Promise<PlaceCard[]> {
  return profileDb("Recent Places Query", async () => {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("get_recent_places_for_user", {
      p_user_id: profileId,
      p_limit: limit,
    });

    if (error) throw error;

    const rows = (data ?? []) as RpcRecentPlaceRow[];
    return rows.map(mapRecentPlaceFromRpc);
  });
}

export async function getPlaceById(id: string, viewerProfileId?: string | null) {
  return profileDb("Place By Id Query", async () => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("places")
      .select(
        `id, user_id, google_place_id, google_maps_url, name, address, latitude, longitude, rating,
         cover_image_url, category_id, likely_audience, likely_vibe, category_source, category_confidence,
         import_notes, search_text, search_enriched, enrichment_status, metadata, created_at, updated_at,
         categories(slug, name),
         place_descriptions(short_text, long_text, interesting_facts),
         place_tags(tags(slug, name)),
         collection_places(collections(id, name, user_id, is_public))`
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    const collRows = (data.collection_places as { collections: unknown }[] | null) ?? [];
    const accessible = collRows.some((row) => {
      const coll = unwrapRelation<{ user_id: string; is_public: boolean }>(row.collections);
      return coll && canAccessCollection(coll, viewerProfileId);
    });

    if (!accessible && data.user_id !== viewerProfileId) {
      throw new Error("Place not found");
    }

    return data;
  });
}

export async function isCollectionOwner(collectionId: string, profileId: string): Promise<boolean> {
  return profileDb("Collection Owner Query", async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("collections")
      .select("user_id")
      .eq("id", collectionId)
      .eq("is_deleted", false)
      .maybeSingle();

    return data?.user_id === profileId;
  });
}

/** Shared helper for search results — avoids duplicating CollectionCard mapping. */
export function mapSearchCollectionRow(
  c: Record<string, unknown>,
  topTags: string[]
): CollectionCard {
  return buildCollectionCard(c, topTags);
}
