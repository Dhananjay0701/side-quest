import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, Lightbulb, MapPin } from "lucide-react";
import { TagPill } from "@/components/places/tag-pill";
import { PlaceEnrichTrigger } from "@/components/places/place-enrich-trigger";
import { Button } from "@/components/ui/button";
import { getAuthProfile } from "@/lib/auth/session";
import { resolveAssetUrl } from "@/lib/images/assets";
import { getPlaceById, unwrapRelation } from "@/lib/db/queries/collections";

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getAuthProfile();

  let place;
  try {
    place = await getPlaceById(id, profile?.id ?? null);
  } catch {
    notFound();
  }

  const category = unwrapRelation<{ slug: string; name: string }>(place.categories);
  const description = unwrapRelation<{
    short_text: string | null;
    long_text: string | null;
    interesting_facts: string[] | null;
  }>(place.place_descriptions);
  const interestingFacts = description?.interesting_facts?.filter(Boolean) ?? [];
  const tagRows = (place.place_tags as { tags: unknown }[] | null) ?? [];
  const tags = tagRows
    .map((row) => unwrapRelation<{ slug: string; name: string }>(row.tags))
    .filter((t): t is { slug: string; name: string } => Boolean(t));
  const collections = (place.collection_places as { collections: unknown }[] | null) ?? [];
  const firstCollection = unwrapRelation<{ id: string; name: string }>(
    collections[0]?.collections
  );

  const summary = description?.long_text ?? description?.short_text;
  const coverUrl = resolveAssetUrl(place.cover_image_url);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      {firstCollection && (
        <p className="mb-4 text-sm text-muted">
          <Link href={`/collections/${firstCollection.id}`} className="hover:text-primary">
            {firstCollection.name}
          </Link>
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-lg shadow-black/10">
        <div className="flex flex-col sm:flex-row">
          {coverUrl && (
            <div className="relative h-44 w-full shrink-0 sm:h-[11rem] sm:w-40 md:w-48">
              <Image
                src={coverUrl}
                alt={place.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 192px"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col justify-center gap-2 p-5">
            <h1 className="text-2xl font-semibold leading-tight">{place.name}</h1>
            {category && <p className="text-sm text-primary">{category.name}</p>}
            {summary && (
              <p className="text-sm leading-relaxed text-muted">{summary}</p>
            )}
            {place.address && (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {place.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {interestingFacts.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border/50 bg-card/40 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <Lightbulb className="h-4 w-4" />
            Interesting facts
          </div>
          <ul className="space-y-2.5">
            {interestingFacts.map((fact, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}

      {place.import_notes && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-card/50 p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Import notes</p>
          <p className="mt-2 text-sm">{place.import_notes}</p>
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagPill key={tag.slug} label={tag.name} />
          ))}
        </div>
      )}

      <Button asChild className="mt-6">
        <a href={place.google_maps_url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          Open in Google Maps
        </a>
      </Button>

      <PlaceEnrichTrigger
        placeId={place.id}
        searchEnriched={place.search_enriched}
        enrichmentStatus={place.enrichment_status}
        coverImageUrl={coverUrl}
      />
    </div>
  );
}
