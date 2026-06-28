import { createAdminClient } from "@/lib/supabase/admin";
import { saveRemoteImageBuffer } from "@/lib/images/save-local-image";
import {
  fetchFirstPlacePhotoBytes,
  isGooglePlacesConfigured,
  resolvePlaceForPhotos,
  type GooglePlaceLookupResult,
} from "@/lib/places/google-places";

const IMPORT_PHOTO_LIMIT = 10;
const PHOTO_MAX_PX = 800;
const CONCURRENCY = 5;

interface PlacePhotoRow {
  id: string;
  name: string;
  google_maps_url: string;
  import_notes: string | null;
  cover_image_url: string | null;
  metadata: Record<string, unknown>;
}

interface PhotoEnrichStats {
  enriched: number;
  skipped: number;
  failed: number;
}

function getPlacesApiId(metadata: Record<string, unknown>): string | null {
  const id = metadata.placesApiId;
  return typeof id === "string" ? id : null;
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function next(): Promise<void> {
    const current = index++;
    if (current >= items.length) return;
    results[current] = await worker(items[current]);
    await next();
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(runners);
  return results;
}

export async function enrichPlacePhoto(
  placeId: string,
  collectionName?: string | null,
  preFetchedLookup?: GooglePlaceLookupResult | null
) {
  if (!isGooglePlacesConfigured()) {
    return { success: false as const, reason: "no_api_key" as const };
  }

  const supabase = createAdminClient();
  const { data: place, error } = await supabase
    .from("places")
    .select("id, name, google_maps_url, import_notes, cover_image_url, address, rating, metadata")
    .eq("id", placeId)
    .single();

  if (error || !place) {
    return { success: false as const, reason: "not_found" as const };
  }

  if (place.cover_image_url) {
    return { success: true as const, skipped: true as const, coverUrl: place.cover_image_url };
  }

  const metadata = (place.metadata ?? {}) as Record<string, unknown>;
  if (metadata.photoFetchFailed === true) {
    return { success: false as const, reason: "previously_failed" as const };
  }

  try {
    const lookup =
      preFetchedLookup ??
      (await resolvePlaceForPhotos({
        name: place.name,
        googleMapsUrl: place.google_maps_url,
        importNotes: place.import_notes,
        collectionName,
        placesApiId: getPlacesApiId(metadata) ?? undefined,
      }));

    const firstPhoto = lookup?.photos?.[0];
    if (!lookup || !firstPhoto?.name) {
      await supabase
        .from("places")
        .update({
          photo_status: "failed",
          metadata: {
            ...metadata,
            ...(lookup?.placesApiId ? { placesApiId: lookup.placesApiId } : {}),
            photoFetchFailed: true,
            photoFetchError: "no_photos",
            photoFetchedAt: new Date().toISOString(),
          },
        })
        .eq("id", placeId);
      return { success: false as const, reason: "no_photos" as const };
    }

    const { buffer, contentType } = await fetchFirstPlacePhotoBytes(firstPhoto.name, PHOTO_MAX_PX);
    const coverUrl = await saveRemoteImageBuffer(buffer, contentType, `place-${placeId.slice(0, 8)}`);

    const attribution = firstPhoto.authorAttributions?.[0]?.displayName ?? null;
    const updates: Record<string, unknown> = {
      cover_image_url: coverUrl,
      photo_status: "ready",
      metadata: {
        ...metadata,
        placesApiId: lookup.placesApiId,
        photoEnriched: true,
        photoWidth: firstPhoto.widthPx ?? null,
        photoHeight: firstPhoto.heightPx ?? null,
        photoAttribution: attribution,
        photoFetchedAt: new Date().toISOString(),
      },
    };

    if (!place.address && lookup.formattedAddress) updates.address = lookup.formattedAddress;
    if (place.rating == null && lookup.rating != null) updates.rating = lookup.rating;
    if (lookup.latitude != null) updates.latitude = lookup.latitude;
    if (lookup.longitude != null) updates.longitude = lookup.longitude;

    await supabase.from("places").update(updates).eq("id", placeId);

    return { success: true as const, skipped: false as const, coverUrl };
  } catch (err) {
    await supabase
      .from("places")
      .update({
        photo_status: "failed",
        metadata: {
          ...metadata,
          photoFetchFailed: true,
          photoFetchError: err instanceof Error ? err.message : "unknown_error",
          photoFetchedAt: new Date().toISOString(),
        },
      })
      .eq("id", placeId);

    return {
      success: false as const,
      reason: "error" as const,
      error: err instanceof Error ? err.message : "Photo fetch failed",
    };
  }
}

export async function enrichPlacePhotoIfNeeded(
  placeId: string,
  collectionName?: string | null,
  preFetchedLookup?: GooglePlaceLookupResult | null
) {
  const supabase = createAdminClient();
  const { data: place } = await supabase
    .from("places")
    .select("cover_image_url")
    .eq("id", placeId)
    .maybeSingle();

  if (place?.cover_image_url) {
    return { skipped: true as const };
  }

  return enrichPlacePhoto(placeId, collectionName, preFetchedLookup);
}

export async function enrichCollectionPlacePhotos(
  collectionId: string,
  options?: { limit?: number; collectionName?: string | null }
): Promise<PhotoEnrichStats> {
  const stats: PhotoEnrichStats = { enriched: 0, skipped: 0, failed: 0 };

  if (!isGooglePlacesConfigured()) return stats;

  const supabase = createAdminClient();
  const limit = options?.limit ?? IMPORT_PHOTO_LIMIT;

  const { data: rows, error } = await supabase
    .from("collection_places")
    .select(
      `sort_order,
       places(id, name, google_maps_url, import_notes, cover_image_url, metadata)`
    )
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error || !rows?.length) return stats;

  const places = rows
    .map((row) => {
      const place = row.places as PlacePhotoRow | PlacePhotoRow[] | null;
      return Array.isArray(place) ? place[0] : place;
    })
    .filter((p): p is PlacePhotoRow => Boolean(p));

  await runPool(places, CONCURRENCY, async (place) => {
    const result = await enrichPlacePhoto(place.id, options?.collectionName);
    if (result.success && !("skipped" in result && result.skipped)) stats.enriched++;
    else if (result.success && "skipped" in result && result.skipped) stats.skipped++;
    else stats.failed++;
  });

  return stats;
}
