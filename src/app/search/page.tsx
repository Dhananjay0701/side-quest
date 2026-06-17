import Link from "next/link";
import { CollectionHeroCard } from "@/components/collections/collection-hero-card";
import { PlaceCardMd } from "@/components/places/place-card";
import { globalSearch } from "@/lib/db/queries/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  if (!q.trim()) {
    return (
      <div className="py-12 text-center text-muted">
        <p>Enter a search term to find collections, places, and tags.</p>
      </div>
    );
  }

  let results: Awaited<ReturnType<typeof globalSearch>> = { collections: [], places: [] };
  try {
    results = await globalSearch(q);
  } catch {
    return <p className="text-muted">Search unavailable. Check Supabase configuration.</p>;
  }

  return (
    <div className="space-y-10 px-4 py-8 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold">Results for &ldquo;{q}&rdquo;</h1>
      </div>

      {results.collections.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">Collections</h2>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
            {results.collections.map((c) => (
              <CollectionHeroCard key={c.id} collection={c} className="h-[420px] w-[360px]" />
            ))}
          </div>
        </section>
      )}

      {results.places.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">Places</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {results.places.map((place) => (
              <div key={place.id}>
                {place.collectionName && (
                  <p className="mb-1 text-xs text-muted">{place.collectionName}</p>
                )}
                <PlaceCardMd place={place} />
              </div>
            ))}
          </div>
        </section>
      )}

      {results.collections.length === 0 && results.places.length === 0 && (
        <p className="text-muted">No results found. Try a different search.</p>
      )}

      <Link href="/" className="text-sm text-primary hover:underline">
        ← Back to collections
      </Link>
    </div>
  );
}
