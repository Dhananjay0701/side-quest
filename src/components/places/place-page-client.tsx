"use client";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, Lightbulb, MapPin } from "lucide-react";
import { TagPill } from "@/components/places/tag-pill";
import { PlaceEnrichTrigger } from "@/components/places/place-enrich-trigger";
import { PlacePageSkeleton } from "@/components/places/place-page-skeleton";
import { Button } from "@/components/ui/button";
import { usePlaceQuery } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";

export function PlacePageClient({ placeId }: { placeId: string }) {
  const placeQuery = usePlaceQuery(placeId);

  const isFirstLoad = placeQuery.isPending && placeQuery.data === undefined;
  const isBackgroundRefresh = placeQuery.isFetching && placeQuery.data !== undefined;

  if (isFirstLoad) {
    return <PlacePageSkeleton />;
  }

  if (placeQuery.isError || !placeQuery.data) {
    notFound();
  }

  const place = placeQuery.data;
  const firstCollection = place.collections[0];
  const summary = place.longDescription ?? place.shortDescription;
  const coverUrl = place.coverImageUrl;
  const interestingFacts = place.interestingFacts?.filter(Boolean) ?? [];

  return (
    <div
      className={cn(
        "mx-auto max-w-3xl px-4 py-8 md:px-8 transition-opacity duration-300 ease-out",
        isBackgroundRefresh && "opacity-[0.98]"
      )}
    >
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
                unoptimized
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 192px"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col justify-center gap-2 p-5">
            <h1 className="text-2xl font-semibold leading-tight">{place.name}</h1>
            {place.category && <p className="text-sm text-primary">{place.category.name}</p>}
            {summary && <p className="text-sm leading-relaxed text-muted">{summary}</p>}
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

      {place.importNotes && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-card/50 p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Import notes</p>
          <p className="mt-2 text-sm">{place.importNotes}</p>
        </div>
      )}

      {place.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {place.tags.map((tag) => (
            <TagPill key={tag.slug} label={tag.name} />
          ))}
        </div>
      )}

      <Button asChild className="mt-6">
        <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          Open in Google Maps
        </a>
      </Button>

      <PlaceEnrichTrigger
        placeId={place.id}
        searchEnriched={place.searchEnriched}
        enrichmentStatus={place.enrichmentStatus}
        coverImageUrl={coverUrl}
      />
    </div>
  );
}
