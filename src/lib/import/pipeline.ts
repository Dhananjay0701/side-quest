import { buildSearchText } from "@/lib/utils/google-maps";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaceholderCoverUrl } from "@/lib/images/collage";
import { enrichCollectionPlacePhotos } from "@/lib/enrich/photo-enrich";
import { slugify } from "@/lib/utils";
import type { NormalizedCollection } from "@/lib/db/types";

async function upsertTag(supabase: ReturnType<typeof createAdminClient>, name: string) {
  const slug = slugify(name);
  const { data: existing } = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("tags")
    .insert({ slug, name, tag_type: "import" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function runImportPipeline(params: {
  userId: string;
  jobId: string;
  collection: NormalizedCollection;
  fileName: string;
  coverImageUrl?: string | null;
  isPublic?: boolean;
}) {
  const supabase = createAdminClient();
  const { userId, jobId, collection, fileName, coverImageUrl, isPublic = false } = params;

  const resolvedCover =
    coverImageUrl ?? getPlaceholderCoverUrl(collection.name);
  const coverSource = coverImageUrl ? "upload" : resolvedCover ? "placeholder" : "collage";

  await supabase
    .from("import_jobs")
    .update({ status: "importing", started_at: new Date().toISOString() })
    .eq("id", jobId);

  const { data: coll, error: collError } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      name: collection.name,
      description: collection.description,
      cover_image_url: resolvedCover,
      cover_source: coverSource,
      is_public: isPublic,
      source: "google_takeout_csv",
    })
    .select("id")
    .single();

  if (collError || !coll) {
    throw new Error(collError?.message ?? "Failed to create collection");
  }

  await supabase.from("import_jobs").update({ collection_id: coll.id }).eq("id", jobId);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < collection.places.length; i++) {
    const place = collection.places[i];

    try {
      let placeId: string;
      let action: "created" | "skipped_duplicate" = "created";

      if (place.googlePlaceId) {
        const { data: existing } = await supabase
          .from("places")
          .select("id")
          .eq("google_place_id", place.googlePlaceId)
          .maybeSingle();

        if (existing) {
          placeId = existing.id;
          action = "skipped_duplicate";
          skipped++;
        } else {
          const { data: inserted, error } = await supabase
            .from("places")
            .insert({
              user_id: userId,
              google_place_id: place.googlePlaceId,
              google_maps_url: place.googleMapsUrl,
              name: place.name,
              import_notes: place.notes,
              search_text: buildSearchText([place.name, place.notes, collection.name]),
              enrichment_status: "pending",
              search_enriched: false,
              metadata: { raw: place.raw },
            })
            .select("id")
            .single();

          if (error || !inserted) throw error;
          placeId = inserted.id;
          created++;
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("places")
          .insert({
            user_id: userId,
            google_maps_url: place.googleMapsUrl,
            name: place.name,
            import_notes: place.notes,
            search_text: buildSearchText([place.name, place.notes, collection.name]),
            enrichment_status: "pending",
            search_enriched: false,
            metadata: { raw: place.raw },
          })
          .select("id")
          .single();

        if (error || !inserted) throw error;
        placeId = inserted.id;
        created++;
      }

      await supabase.from("collection_places").upsert(
        { collection_id: coll.id, place_id: placeId, sort_order: i },
        { onConflict: "collection_id,place_id" }
      );

      await supabase.from("import_job_places").upsert(
        { import_job_id: jobId, place_id: placeId, action },
        { onConflict: "import_job_id,place_id" }
      );

      if (action === "skipped_duplicate") continue;

      for (const tagName of place.importTags) {
        const tagId = await upsertTag(supabase, tagName);
        await supabase.from("place_tags").upsert(
          { place_id: placeId, tag_id: tagId, source: "import" },
          { onConflict: "place_id,tag_id" }
        );
      }
    } catch {
      errors++;
    }
  }

  let photoStats = { enriched: 0, skipped: 0, failed: 0 };

  await supabase
    .from("import_jobs")
    .update({ status: "enriching_photos" })
    .eq("id", jobId);

  try {
    photoStats = await enrichCollectionPlacePhotos(coll.id, {
      limit: 10,
      collectionName: collection.name,
    });
  } catch {
    // Photo enrichment is best-effort — import still succeeds
  }

  await supabase
    .from("import_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      stats: {
        fileName,
        total: collection.places.length,
        created,
        skipped,
        errors,
        photos: photoStats,
        note: "First 10 places get Google photos on import; Gemini runs when you open a place",
      },
    })
    .eq("id", jobId);
}
