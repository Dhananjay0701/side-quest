import { createAdminClient } from "@/lib/supabase/admin";
import {
  canAccessCollection,
  getCollectionTopTags,
  unwrapProfile,
  unwrapRelation,
} from "@/lib/db/queries/collections";
import { resolveAssetUrl } from "@/lib/images/assets";
import type { CollectionCard, PlaceCard } from "@/lib/db/types";

export async function globalSearch(
  q: string,
  viewerProfileId?: string | null,
  limit = 20
): Promise<{ collections: CollectionCard[]; places: PlaceCard[] }> {
  const supabase = createAdminClient();
  const trimmed = q.trim();
  if (!trimmed) return { collections: [], places: [] };

  let collectionsQuery = supabase
    .from("collections")
    .select("id, name, description, place_count, cover_image_url, is_public, user_id, profiles(display_name, avatar_url, username)")
    .eq("is_deleted", false)
    .or(`name.ilike.%${trimmed}%,description.ilike.%${trimmed}%`)
    .limit(8);

  if (viewerProfileId) {
    collectionsQuery = collectionsQuery.or(`is_public.eq.true,user_id.eq.${viewerProfileId}`);
  } else {
    collectionsQuery = collectionsQuery.eq("is_public", true);
  }

  const { data: collections } = await collectionsQuery;

  const collectionResults: CollectionCard[] = [];
  for (const c of collections ?? []) {
    if (!canAccessCollection(c, viewerProfileId)) continue;
    const topTags = await getCollectionTopTags(c.id, 4);
    const owner = unwrapProfile(c.profiles);
    collectionResults.push({
      id: c.id,
      name: c.name,
      description: c.description,
      placeCount: c.place_count,
      coverImageUrl: resolveAssetUrl(c.cover_image_url),
      isPublic: c.is_public,
      topTags,
      user: {
        displayName: owner?.display_name ?? "Traveler",
        avatarUrl: owner?.avatar_url ?? null,
        username: owner?.username,
      },
    });
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
      googleMapsUrl: row.google_maps_url,
      likelyAudience: row.likely_audience,
      likelyVibe: row.likely_vibe,
      collectionName: unwrapRelation<{ name: string }>(collRows?.[0]?.collections)?.name,
    });

    if (placeResults.length >= limit) break;
  }

  return { collections: collectionResults, places: placeResults.slice(0, limit) };
}
