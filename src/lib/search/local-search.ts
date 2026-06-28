import { createAdminClient } from "@/lib/supabase/admin";
import { profileDb } from "@/lib/debug/profiler";
import { resolveAssetUrl } from "@/lib/images/assets";
import {
  canAccessCollection,
  getCollectionsTopTagsMap,
  mapSearchCollectionRow,
  unwrapRelation,
} from "@/lib/db/queries/collections";
import type {
  CitySearchHit,
  CollectionSearchHit,
  LocalPlaceHit,
  PlaceSource,
  PlaceTier,
} from "@/lib/search/types";

interface RpcPlaceRow {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  place_tier: string;
  place_source: string;
  google_maps_url: string | null;
  score: number;
}

export async function searchLocalPlaces(
  q: string,
  limit = 8
): Promise<LocalPlaceHit[]> {
  return profileDb("search.local.places", async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("search_places_global", {
      q,
      result_limit: limit,
    });

    if (error) {
      console.error("search_places_global failed:", error.message);
      return [];
    }

    return ((data as RpcPlaceRow[]) ?? []).map((row) => ({
      kind: "place" as const,
      id: row.id,
      name: row.name,
      address: row.address,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
      coverImageUrl: resolveAssetUrl(row.cover_image_url),
      placeTier: (row.place_tier as PlaceTier) || "full",
      source: (row.place_source as PlaceSource) || "import",
      googleMapsUrl: row.google_maps_url,
    }));
  });
}

export async function searchLocalCollections(
  q: string,
  viewerProfileId: string | null | undefined,
  limit = 6
): Promise<CollectionSearchHit[]> {
  return profileDb("search.local.collections", async () => {
    const supabase = createAdminClient();
    const trimmed = q.trim();
    if (!trimmed) return [];

    const { data: collections } = await supabase
      .from("collections")
      .select(
        "id, name, description, place_count, cover_image_url, is_public, user_id, profiles(display_name, avatar_url, username)"
      )
      .eq("is_deleted", false)
      .textSearch("search_vector", trimmed, { type: "websearch", config: "english" })
      .limit(24);

    const visible = (collections ?? []).filter((c) => canAccessCollection(c, viewerProfileId));
    const topTagsMap = await getCollectionsTopTagsMap(
      visible.slice(0, 8).map((c) => c.id),
      4
    );

    const results: CollectionSearchHit[] = [];
    for (const c of visible) {
      if (results.length >= limit) break;
      const card = mapSearchCollectionRow(c as Record<string, unknown>, topTagsMap.get(c.id) ?? []);
      results.push({
        kind: "collection",
        id: card.id,
        name: card.name,
        description: card.description,
        placeCount: card.placeCount,
        coverImageUrl: card.coverImageUrl,
        isPublic: card.isPublic,
        isOwned: viewerProfileId ? c.user_id === viewerProfileId : undefined,
      });
    }
    return results;
  });
}

/** Collections owned by the signed-in user only (includes private). */
export async function searchUserOwnedCollections(
  q: string,
  userId: string,
  limit = 6
): Promise<CollectionSearchHit[]> {
  return profileDb("search.local.user-collections", async () => {
    const supabase = createAdminClient();
    const trimmed = q.trim();
    if (!trimmed) return [];

    const { data: collections } = await supabase
      .from("collections")
      .select("id, name, description, place_count, cover_image_url, is_public, user_id")
      .eq("is_deleted", false)
      .eq("user_id", userId)
      .textSearch("search_vector", trimmed, { type: "websearch", config: "english" })
      .limit(limit);

    return (collections ?? []).map((c) => ({
      kind: "collection" as const,
      id: c.id,
      name: c.name,
      description: c.description,
      placeCount: c.place_count,
      coverImageUrl: resolveAssetUrl(c.cover_image_url),
      isPublic: c.is_public,
      isOwned: true,
    }));
  });
}

/** Places matching query that appear in the viewer's own collections. */
export async function searchPlacesWithUserCollections(
  q: string,
  userId: string,
  limit = 8
): Promise<LocalPlaceHit[]> {
  return profileDb("search.local.places-in-collections", async () => {
    const supabase = createAdminClient();
    const places = await searchLocalPlaces(q, limit * 2);
    if (places.length === 0) return [];

    const placeIds = places.map((p) => p.id);
    const { data: links } = await supabase
      .from("collection_places")
      .select("place_id, collections!inner(id, name, user_id)")
      .in("place_id", placeIds)
      .eq("collections.user_id", userId);

    const collectionsByPlace = new Map<string, { id: string; name: string }[]>();
    for (const row of links ?? []) {
      const coll = unwrapRelation<{ id: string; name: string }>(row.collections);
      if (!coll) continue;
      const list = collectionsByPlace.get(row.place_id) ?? [];
      list.push({ id: coll.id, name: coll.name });
      collectionsByPlace.set(row.place_id, list);
    }

    return places
      .filter((p) => collectionsByPlace.has(p.id))
      .slice(0, limit)
      .map((p) => ({
        ...p,
        inCollections: collectionsByPlace.get(p.id) ?? [],
      }));
  });
}

export async function searchCities(q: string, limit = 5): Promise<CitySearchHit[]> {
  return profileDb("search.local.cities", async () => {
    const supabase = createAdminClient();
    const trimmed = q.trim();
    if (!trimmed) return [];

    const { data: items } = await supabase
      .from("cms_section_items")
      .select("id, label, image_key, href")
      .eq("item_type", "city")
      .ilike("label", `%${trimmed}%`)
      .limit(limit);

    return (items ?? []).map((item) => ({
      kind: "city" as const,
      id: item.id,
      name: item.label ?? "City",
      href: item.href ?? "#",
      imageUrl: resolveAssetUrl(item.image_key),
    }));
  });
}
