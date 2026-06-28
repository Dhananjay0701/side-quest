import { createAdminClient } from "@/lib/supabase/admin";
import { profileDb } from "@/lib/debug/profiler";
import {
  canAccessCollection,
  getCollectionsTopTagsMap,
  mapSearchCollectionRow,
  unwrapRelation,
} from "@/lib/db/queries/collections";
import { resolveAssetUrl } from "@/lib/images/assets";
import type { CollectionCard, PlaceCard } from "@/lib/db/types";

export async function globalSearch(
  q: string,
  viewerProfileId?: string | null,
  limit = 20
): Promise<{ collections: CollectionCard[]; places: PlaceCard[] }> {
  return profileDb("Search Query", async () => {
  const supabase = createAdminClient();
  const trimmed = q.trim();
  if (!trimmed) return { collections: [], places: [] };

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, description, place_count, cover_image_url, is_public, user_id, profiles(display_name, avatar_url, username)")
    .eq("is_deleted", false)
    .textSearch("search_vector", trimmed, { type: "websearch", config: "english" })
    .limit(24);

  const collectionResults: CollectionCard[] = [];
  const visible = (collections ?? []).filter((c) => canAccessCollection(c, viewerProfileId));
  const topTagsMap = await getCollectionsTopTagsMap(
    visible.slice(0, 8).map((c) => c.id),
    4
  );

  for (const c of visible) {
    if (collectionResults.length >= 8) break;
    collectionResults.push(mapSearchCollectionRow(c as Record<string, unknown>, topTagsMap.get(c.id) ?? []));
  }

  const { data: places } = await supabase
    .from("places")
    .select(
      `id, name, address, rating, cover_image_url, google_maps_url, likely_audience, likely_vibe, user_id,
       categories(slug, name),
       place_descriptions(short_text),
       place_tags(tags(slug, name)),
       collection_places(collections(name, user_id, is_public))`
    )
    .textSearch("search_vector", trimmed, { type: "websearch", config: "english" })
    .limit(limit * 2);

  const placeResults: PlaceCard[] = [];

  for (const row of places ?? []) {
    const collRows = row.collection_places as { collections: unknown }[] | null;
    const accessible = collRows?.some((r) => {
      const coll = unwrapRelation<{ user_id: string; is_public: boolean }>(r.collections);
      return coll && canAccessCollection(coll, viewerProfileId);
    });
    if (!accessible && row.user_id !== viewerProfileId) continue;

    const category = unwrapRelation<{ slug: string; name: string }>(row.categories);
    const desc = unwrapRelation<{ short_text: string | null }>(row.place_descriptions);
    const tagRows = (row.place_tags as { tags: unknown }[] | null) ?? [];

    placeResults.push({
      id: row.id,
      name: row.name,
      category: category ? { slug: category.slug, name: category.name } : null,
      tags: tagRows
        .map((t) => unwrapRelation<{ slug: string; name: string }>(t.tags))
        .filter((t): t is { slug: string; name: string } => Boolean(t)),
      address: row.address,
      rating: row.rating,
      coverImageUrl: resolveAssetUrl(row.cover_image_url),
      shortDescription: desc?.short_text ?? null,
      googleMapsUrl: row.google_maps_url ?? null,
      likelyAudience: row.likely_audience,
      likelyVibe: row.likely_vibe,
      collectionName: unwrapRelation<{ name: string }>(collRows?.[0]?.collections)?.name,
    });

    if (placeResults.length >= limit) break;
  }

  return { collections: collectionResults, places: placeResults.slice(0, limit) };
  });
}
