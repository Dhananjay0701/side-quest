import { createAdminClient } from "@/lib/supabase/admin";
import { profileDb } from "@/lib/debug/profiler";
import { incrementPopularityOnSave } from "@/lib/search/popularity";
import { recordSearchUsage } from "@/lib/search/usage";
import { lightPlaceFromInput } from "@/lib/search/place-url";
import type { CreatePlaceInput } from "@/lib/search/validation";
import type { CreatePlaceResult } from "@/lib/search/types";

async function findExistingPlace(
  supabase: ReturnType<typeof createAdminClient>,
  ids: {
    googlePlaceId?: string | null;
    placesApiId?: string | null;
  }
): Promise<string | null> {
  if (ids.googlePlaceId) {
    const { data } = await supabase
      .from("places")
      .select("id")
      .eq("google_place_id", ids.googlePlaceId)
      .maybeSingle();
    if (data) return data.id;
  }

  if (ids.placesApiId) {
    const { data } = await supabase
      .from("places")
      .select("id")
      .eq("places_api_id", ids.placesApiId)
      .maybeSingle();
    if (data) return data.id;
  }

  return null;
}

async function assertCollectionOwnership(
  supabase: ReturnType<typeof createAdminClient>,
  collectionId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("collections")
    .select("id, user_id, is_deleted")
    .eq("id", collectionId)
    .single();

  if (error || !data || data.is_deleted) {
    throw new Error("Collection not found");
  }
  if (data.user_id !== userId) {
    throw new Error("You do not own this collection");
  }
  return data;
}

export async function createOrLinkPlace(
  input: CreatePlaceInput,
  userId: string,
  _sessionToken?: string
): Promise<CreatePlaceResult> {
  return profileDb("Create Place", async () => {
    const supabase = createAdminClient();
    await assertCollectionOwnership(supabase, input.collectionId, userId);

    let placeId = input.placeId ?? null;
    let created = false;

    if (!placeId && input.external) {
      const external = input.external;

      const existingId = await findExistingPlace(supabase, {
        googlePlaceId: external.googlePlaceId,
        placesApiId: external.placesApiId,
      });

      if (existingId) {
        placeId = existingId;
        recordSearchUsage("search", "duplicate_place_prevented");
      } else {
        const row = lightPlaceFromInput(external);
        const { data: inserted, error } = await supabase
          .from("places")
          .insert({
            user_id: userId,
            ...row,
            place_tier: "light",
            enrichment_status: "pending",
            search_enriched: false,
            photo_status: "none",
            popularity_score: 0,
            metadata: external.category ? { categoryHint: external.category } : {},
          })
          .select("id")
          .single();

        if (error || !inserted) throw new Error(error?.message ?? "Failed to create place");
        placeId = inserted.id;
        created = true;
      }
    }

    if (!placeId) {
      throw new Error("Place not found");
    }

    const { data: existingLink } = await supabase
      .from("collection_places")
      .select("place_id")
      .eq("collection_id", input.collectionId)
      .eq("place_id", placeId)
      .maybeSingle();

    const isNewLink = !existingLink;

    const { count } = await supabase
      .from("collection_places")
      .select("place_id", { count: "exact", head: true })
      .eq("collection_id", input.collectionId);

    await supabase.from("collection_places").upsert(
      {
        collection_id: input.collectionId,
        place_id: placeId,
        sort_order: count ?? 0,
      },
      { onConflict: "collection_id,place_id" }
    );

    if (isNewLink) {
      const { data: coll } = await supabase
        .from("collections")
        .select("place_count")
        .eq("id", input.collectionId)
        .single();

      await supabase
        .from("collections")
        .update({
          place_count: (coll?.place_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.collectionId);

      const { data: placeRow } = await supabase
        .from("places")
        .select("save_count, place_tier, popularity_score, search_enriched, cover_image_url")
        .eq("id", placeId)
        .single();

      const newSaveCount = (placeRow?.save_count ?? 0) + 1;
      const newPopularity = incrementPopularityOnSave(placeRow?.popularity_score ?? 0);

      await supabase
        .from("places")
        .update({
          save_count: newSaveCount,
          popularity_score: newPopularity,
        })
        .eq("id", placeId);

      // Enrichment is deferred until the user opens the place (lazy enrich on interaction).

      return {
        placeId,
        tier: (placeRow?.place_tier as "light" | "full") ?? "light",
        enrichmentQueued: false,
        created,
      };
    }

    const { data: placeRow } = await supabase
      .from("places")
      .select("place_tier")
      .eq("id", placeId)
      .single();

    return {
      placeId,
      tier: (placeRow?.place_tier as "light" | "full") ?? "light",
      enrichmentQueued: false,
      created,
    };
  });
}

export async function listUserCollectionsForPicker(userId: string, q = "", limit = 20) {
  const supabase = createAdminClient();
  const trimmed = q.trim();

  let query = supabase
    .from("collections")
    .select("id, name, description, place_count, cover_image_url, is_public")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (trimmed) {
    query = query.or(`name.ilike.%${trimmed}%,description.ilike.%${trimmed}%`);
  }

  const { data } = await query;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    placeCount: c.place_count,
    coverImageUrl: c.cover_image_url,
    isPublic: c.is_public,
  }));
}
