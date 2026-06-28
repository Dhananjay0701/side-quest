import { createAdminClient } from "@/lib/supabase/admin";
import { profileAI } from "@/lib/debug/profiler";
import { applyPlaceEnrichment } from "@/lib/enrich/lazy-enrich";
import { enrichPlacePhotoIfNeeded } from "@/lib/enrich/photo-enrich";
import { getPlaceDetails, type GooglePlaceLookupResult } from "@/lib/places/google-places";
import { unwrapRelation } from "@/lib/db/queries/collections";
import { runInBackground } from "@/lib/cloudflare/wait-until";
import { recordSearchUsage } from "@/lib/search/usage";

const MAX_ATTEMPTS = 3;

export async function enqueuePlaceEnrichment(
  placeId: string,
  triggerReason: string
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("enrichment_jobs")
    .select("id")
    .eq("place_id", placeId)
    .in("status", ["queued", "processing"])
    .maybeSingle();

  if (existing) {
    recordSearchUsage("search", "enrichment_skipped");
    return existing.id;
  }

  const { data: job, error } = await supabase
    .from("enrichment_jobs")
    .insert({
      place_id: placeId,
      status: "queued",
      trigger_reason: triggerReason,
    })
    .select("id")
    .single();

  if (error || !job) return null;

  await runInBackground(() => runEnrichmentJob(job.id));
  return job.id;
}

export async function runEnrichmentJob(jobId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("enrichment_jobs")
    .select("id, place_id, status, attempts")
    .eq("id", jobId)
    .single();

  if (!job || job.status === "completed" || job.status === "failed") return;
  if (job.attempts >= MAX_ATTEMPTS) {
    await supabase
      .from("enrichment_jobs")
      .update({ status: "failed", error_message: "Max attempts exceeded" })
      .eq("id", jobId);
    return;
  }

  await supabase
    .from("enrichment_jobs")
    .update({
      status: "processing",
      attempts: job.attempts + 1,
      started_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  try {
    await profileAI("enrich.job", async () => {
      const { data: place } = await supabase
        .from("places")
        .select(
          `id, name, import_notes, google_maps_url, address, latitude, longitude,
           places_api_id, place_tier, search_enriched, cover_image_url,
           collection_places(collections(name))`
        )
        .eq("id", job.place_id)
        .single();

      if (!place) throw new Error("Place not found");
      if (place.place_tier === "full" && place.search_enriched && place.cover_image_url) {
        recordSearchUsage("search", "enrichment_skipped");
        await markJobCompleted(jobId);
        return;
      }

      await supabase
        .from("places")
        .update({ photo_status: "pending", enrichment_status: "processing" })
        .eq("id", place.id);

      const collectionNames = (
        (place.collection_places as { collections: unknown }[] | null) ?? []
      )
        .map((row) => unwrapRelation<{ name: string }>(row.collections)?.name)
        .filter((n): n is string => Boolean(n));

      const primaryCollection = collectionNames[0] ?? null;

      let googleLookup: GooglePlaceLookupResult | null = null;
      const placesApiId = place.places_api_id;
      if (placesApiId) {
        googleLookup = await getPlaceDetails(placesApiId);
        if (googleLookup) {
          const { data: current } = await supabase
            .from("places")
            .select("metadata")
            .eq("id", place.id)
            .single();
          const metadata = (current?.metadata ?? {}) as Record<string, unknown>;

          await supabase
            .from("places")
            .update({
              address: place.address ?? googleLookup.formattedAddress ?? null,
              latitude: place.latitude ?? googleLookup.latitude ?? null,
              longitude: place.longitude ?? googleLookup.longitude ?? null,
              metadata: { ...metadata, placesApiId: googleLookup.placesApiId },
            })
            .eq("id", place.id);
        }
      }

      await enrichPlacePhotoIfNeeded(place.id, primaryCollection, googleLookup);

      if (!place.search_enriched) {
        await applyPlaceEnrichment({
          placeId: place.id,
          name: place.name,
          notes: place.import_notes,
          googleMapsUrl: place.google_maps_url ?? "",
          collectionNames,
        });
      }

      await supabase
        .from("places")
        .update({
          place_tier: "full",
          enrichment_status: "done",
          enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", place.id);

      await markJobCompleted(jobId);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed";
    await supabase
      .from("enrichment_jobs")
      .update({
        status: job.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "queued",
        error_message: message,
      })
      .eq("id", jobId);

    if (job.attempts + 1 < MAX_ATTEMPTS) {
      await runInBackground(() => runEnrichmentJob(jobId));
    }
  }
}

async function markJobCompleted(jobId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("enrichment_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
