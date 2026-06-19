import { getAuthProfile } from "@/lib/auth/session";
import { resolveAssetUrl } from "@/lib/images/assets";
import { getPlaceById } from "@/lib/db/queries/collections";
import { runLazyPlaceEnrichment } from "@/lib/enrich/lazy-enrich";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await getAuthProfile();
    const place = await getPlaceById(id, profile?.id ?? null);

    const category = place.categories as { slug: string; name: string } | null;
    const description = place.place_descriptions as {
      short_text: string | null;
      long_text: string | null;
      interesting_facts: string[] | null;
    } | null;
    const tagRows = (place.place_tags as { tags: { slug: string; name: string } }[] | null) ?? [];
    const collections = (place.collection_places as { collections: { id: string; name: string } }[] | null) ?? [];

    return apiSuccess({
      id: place.id,
      name: place.name,
      address: place.address,
      rating: place.rating,
      coverImageUrl: resolveAssetUrl(place.cover_image_url),
      googleMapsUrl: place.google_maps_url,
      category: category ? { slug: category.slug, name: category.name } : null,
      tags: tagRows.map((t) => t.tags).filter(Boolean),
      shortDescription: description?.short_text,
      longDescription: description?.long_text,
      interestingFacts: description?.interesting_facts ?? [],
      importNotes: place.import_notes,
      searchEnriched: place.search_enriched,
      enrichmentStatus: place.enrichment_status,
      metadata: place.metadata,
      collections: collections.map((c) => c.collections),
      createdAt: place.created_at,
    });
  } catch (err) {
    return apiError("PLACE_ERROR", err instanceof Error ? err.message : "Place not found", 404);
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const outcome = await runLazyPlaceEnrichment(id);

    if (outcome.alreadyEnriched) {
      return apiSuccess({ searchEnriched: true, message: "Already enriched" });
    }

    return apiSuccess({
      searchEnriched: true,
      category: outcome.result.category,
      tags: outcome.result.tags,
      shortDescription: outcome.result.short_description,
      interestingFacts: outcome.result.interesting_facts,
    });
  } catch (err) {
    return apiError("ENRICH_ERROR", err instanceof Error ? err.message : "Enrichment failed", 500);
  }
}
