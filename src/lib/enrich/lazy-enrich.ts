import { slugify } from "@/lib/utils";
import { buildSearchText } from "@/lib/utils/google-maps";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichPlaceWithLlm, getEnrichmentModel, getPromptVersion } from "@/lib/enrich/categorize";
import { enrichPlacePhotoIfNeeded } from "@/lib/enrich/photo-enrich";
import { unwrapRelation } from "@/lib/db/queries/collections";
import { profileAI } from "@/lib/debug/profiler";

async function upsertTag(
  supabase: ReturnType<typeof createAdminClient>,
  name: string,
  source: string
) {
  const slug = slugify(name);
  const { data: existing } = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("tags")
    .insert({ slug, name, tag_type: source === "import" ? "import" : "auto" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function getCategoryId(supabase: ReturnType<typeof createAdminClient>, slug: string) {
  const { data } = await supabase.from("categories").select("id").eq("slug", slug).single();
  return data?.id ?? null;
}

export async function applyPlaceEnrichment(params: {
  placeId: string;
  name: string;
  notes: string | null;
  googleMapsUrl: string;
  collectionNames?: string[];
}) {
  const supabase = createAdminClient();
  const llm = await enrichPlaceWithLlm({
    name: params.name,
    notes: params.notes,
    googleMapsUrl: params.googleMapsUrl,
  });

  const categoryId = await getCategoryId(supabase, llm.category);

  for (const tag of llm.tags) {
    const tagId = await upsertTag(supabase, tag, "llm");
    await supabase.from("place_tags").upsert(
      { place_id: params.placeId, tag_id: tagId, source: "llm", confidence: llm.confidence },
      { onConflict: "place_id,tag_id" }
    );
  }

  const { data: tagRows } = await supabase
    .from("place_tags")
    .select("tags(name)")
    .eq("place_id", params.placeId);

  const tagNames = (tagRows ?? [])
    .map((r) => unwrapRelation<{ name: string }>(r.tags)?.name)
    .filter((n): n is string => Boolean(n));

  const searchText = buildSearchText([
    params.name,
    params.notes,
    llm.category,
    llm.short_description,
    ...llm.interesting_facts,
    ...tagNames,
    ...(params.collectionNames ?? []),
  ]);

  await supabase
    .from("places")
    .update({
      category_id: categoryId,
      category_confidence: llm.confidence,
      category_source: "llm",
      search_text: searchText,
      search_enriched: true,
      enrichment_status: "done",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.placeId);

  await supabase.from("place_descriptions").upsert(
    {
      place_id: params.placeId,
      short_text: llm.short_description,
      long_text: llm.short_description,
      interesting_facts: llm.interesting_facts,
      source: "llm_detail",
      model: getEnrichmentModel(),
      prompt_version: getPromptVersion(),
    },
    { onConflict: "place_id" }
  );

  return llm;
}

export async function runLazyPlaceEnrichment(placeId: string) {
  return profileAI("Place Enrichment", async () => {
  const supabase = createAdminClient();

  const { data: place, error } = await supabase
    .from("places")
    .select(
      `id, name, import_notes, google_maps_url, search_enriched,
       collection_places(collections(name))`
    )
    .eq("id", placeId)
    .single();

  if (error || !place) {
    throw new Error("Place not found");
  }

  const collectionNames = (
    (place.collection_places as { collections: unknown }[] | null) ?? []
  )
    .map((row) => unwrapRelation<{ name: string }>(row.collections)?.name)
    .filter((n): n is string => Boolean(n));

  const primaryCollection = collectionNames[0] ?? null;

  await enrichPlacePhotoIfNeeded(placeId, primaryCollection);

  if (place.search_enriched) {
    return { alreadyEnriched: true as const };
  }

  await supabase
    .from("places")
    .update({ enrichment_status: "processing" })
    .eq("id", placeId);

  try {
    const result = await applyPlaceEnrichment({
      placeId: place.id,
      name: place.name,
      notes: place.import_notes,
      googleMapsUrl: place.google_maps_url,
      collectionNames,
    });

    return { alreadyEnriched: false as const, result };
  } catch (err) {
    await supabase
      .from("places")
      .update({ enrichment_status: "failed" })
      .eq("id", placeId);
    throw err;
  }
  });
}
