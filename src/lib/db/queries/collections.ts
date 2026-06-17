import { createAdminClient } from "@/lib/supabase/admin";
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

async function mapCollectionRows(
  collections: Record<string, unknown>[]
): Promise<CollectionCard[]> {
  const result: CollectionCard[] = [];

  for (const c of collections) {
    const topTags = await getCollectionTopTags(c.id as string, 4);
    const owner = unwrapProfile(c.profiles);

    result.push({
      id: c.id as string,
      name: c.name as string,
      description: c.description as string | null,
      placeCount: c.place_count as number,
      coverImageUrl: c.cover_image_url as string | null,
      isPublic: c.is_public as boolean,
      topTags,
      user: {
        displayName: owner?.display_name ?? "Traveler",
        avatarUrl: owner?.avatar_url ?? null,
        username: owner?.username,
      },
    });
  }

  return result;
}

export function canAccessCollection(
  collection: { user_id: string; is_public: boolean },
  viewerProfileId?: string | null
): boolean {
  if (viewerProfileId && collection.user_id === viewerProfileId) return true;
  return collection.is_public;
}

export async function getMyCollections(profileId: string): Promise<CollectionCard[]> {
  const supabase = createAdminClient();

  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, name, description, place_count, cover_image_url, is_public, profiles(display_name, avatar_url, username)")
    .eq("user_id", profileId)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!collections?.length) return [];

  return mapCollectionRows(collections as Record<string, unknown>[]);
}

export async function getPublicCollections(limit = 24): Promise<CollectionCard[]> {
  const supabase = createAdminClient();

  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, name, description, place_count, cover_image_url, is_public, profiles(display_name, avatar_url, username)")
    .eq("is_public", true)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!collections?.length) return [];

  return mapCollectionRows(collections as Record<string, unknown>[]);
}

/** @deprecated Use getMyCollections */
export async function getAllCollections(): Promise<CollectionCard[]> {
  const supabase = createAdminClient();

  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, name, description, place_count, cover_image_url, is_public, profiles(display_name, avatar_url, username)")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!collections?.length) return [];

  return mapCollectionRows(collections as Record<string, unknown>[]);
}

export async function getCollectionTopTags(collectionId: string, limit = 6): Promise<string[]> {
  const supabase = createAdminClient();

  const { data: placeIds } = await supabase
    .from("collection_places")
    .select("place_id")
    .eq("collection_id", collectionId);

  if (!placeIds?.length) return [];

  const ids = placeIds.map((p) => p.place_id);

  const { data: tagRows } = await supabase
    .from("place_tags")
    .select("tag_id, tags(name)")
    .in("place_id", ids);

  const counts = new Map<string, number>();
  for (const row of tagRows ?? []) {
    const name = unwrapRelation<{ name: string }>(row.tags)?.name;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

export async function getCollectionById(id: string, viewerProfileId?: string | null) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*, profiles(display_name, avatar_url, username)")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error) throw error;

  if (!canAccessCollection(data, viewerProfileId)) {
    throw new Error("Collection not found");
  }

  return data;
}

export async function getCollectionFilters(collectionId: string) {
  const supabase = createAdminClient();

  const { data: placeIds } = await supabase
    .from("collection_places")
    .select("place_id")
    .eq("collection_id", collectionId);

  if (!placeIds?.length) {
    return { categories: [], tags: [] };
  }

  const ids = placeIds.map((p) => p.place_id);

  const { data: places } = await supabase
    .from("places")
    .select("category_id, categories(slug, name)")
    .in("id", ids);

  const catCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of places ?? []) {
    const cat = unwrapRelation<{ slug: string; name: string }>(p.categories);
    if (!cat) continue;
    const existing = catCounts.get(cat.slug) ?? { ...cat, count: 0 };
    existing.count++;
    catCounts.set(cat.slug, existing);
  }

  const { data: tagRows } = await supabase
    .from("place_tags")
    .select("tag_id, tags(slug, name)")
    .in("place_id", ids);

  const tagCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const row of tagRows ?? []) {
    const tag = unwrapRelation<{ slug: string; name: string }>(row.tags);
    if (!tag) continue;
    const existing = tagCounts.get(tag.slug) ?? { ...tag, count: 0 };
    existing.count++;
    tagCounts.set(tag.slug, existing);
  }

  return {
    categories: [...catCounts.values()].sort((a, b) => b.count - a.count),
    tags: [...tagCounts.values()].sort((a, b) => b.count - a.count),
  };
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
    coverImageUrl: row.cover_image_url as string | null,
    shortDescription: shortDesc ?? null,
    googleMapsUrl: row.google_maps_url as string,
    likelyAudience: row.likely_audience as string | null,
    likelyVibe: row.likely_vibe as string | null,
  };
}

export async function getPlaces(params: {
  collectionId?: string;
  q?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ places: PlaceCard[]; total: number }> {
  const supabase = createAdminClient();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let placeIds: string[] | null = null;
  let sortOrder = new Map<string, number>();

  if (params.collectionId) {
    const { data } = await supabase
      .from("collection_places")
      .select("place_id, sort_order")
      .eq("collection_id", params.collectionId)
      .order("sort_order", { ascending: true });
    placeIds = data?.map((p) => p.place_id) ?? [];
    sortOrder = new Map(data?.map((p) => [p.place_id, p.sort_order]) ?? []);
    if (placeIds.length === 0) return { places: [], total: 0 };
  }

  let query = supabase
    .from("places")
    .select(
      `id, name, address, rating, cover_image_url, google_maps_url, likely_audience, likely_vibe,
       categories(slug, name),
       place_descriptions(short_text),
       place_tags(tags(slug, name))`,
      { count: "exact" }
    );

  if (placeIds) query = query.in("id", placeIds);
  else query = query.order("name");

  if (params.category) {
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", params.category).single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  if (params.q?.trim()) {
    query = query.textSearch("search_vector", params.q.trim(), { type: "websearch", config: "english" });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  let places = (data ?? []).map((row) => mapPlaceRow(row as Record<string, unknown>));

  if (params.collectionId && sortOrder.size > 0) {
    places.sort(
      (a, b) => (sortOrder.get(a.id) ?? 0) - (sortOrder.get(b.id) ?? 0)
    );
  }

  if (params.tags?.length) {
    const filtered: PlaceCard[] = [];
    for (const place of places) {
      const slugs = new Set(place.tags.map((t) => t.slug));
      if (params.tags.every((t) => slugs.has(t))) filtered.push(place);
    }
    places = filtered;
  }

  return { places, total: count ?? places.length };
}

export async function getRecentPlaces(profileId: string, limit = 12): Promise<PlaceCard[]> {
  const supabase = createAdminClient();

  const { data: ownedCollections } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", profileId)
    .eq("is_deleted", false);

  const collectionIds = ownedCollections?.map((c) => c.id) ?? [];
  if (collectionIds.length === 0) return [];

  const { data: links } = await supabase
    .from("collection_places")
    .select("place_id")
    .in("collection_id", collectionIds);

  const placeIds = [...new Set(links?.map((l) => l.place_id) ?? [])];
  if (placeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("places")
    .select(
      `id, name, address, rating, cover_image_url, google_maps_url, likely_audience, likely_vibe, created_at,
       categories(slug, name),
       place_descriptions(short_text),
       place_tags(tags(slug, name)),
       collection_places(collections(name))`
    )
    .in("id", placeIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const mapped = mapPlaceRow(row as Record<string, unknown>);
    const collRows = row.collection_places as { collections: unknown }[] | null;
    const collectionName = unwrapRelation<{ name: string }>(collRows?.[0]?.collections)?.name;
    return { ...mapped, collectionName };
  });
}

export async function getPlaceById(id: string, viewerProfileId?: string | null) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("places")
    .select(
      `*, categories(slug, name),
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
}

export async function isCollectionOwner(collectionId: string, profileId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("collections")
    .select("user_id")
    .eq("id", collectionId)
    .eq("is_deleted", false)
    .maybeSingle();

  return data?.user_id === profileId;
}
