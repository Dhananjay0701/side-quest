import { CollectionsSection } from "@/components/collections/collection-hero-card";
import { HeroSection } from "@/components/home/hero-section";
import { getPublicCollections } from "@/lib/db/queries/collections";

export default async function ExplorePage() {
  let collections: Awaited<ReturnType<typeof getPublicCollections>> = [];
  let error: string | null = null;

  try {
    collections = await getPublicCollections();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load public collections";
  }

  return (
    <div className="min-h-screen">
      <HeroSection />

      {error && (
        <div className="mx-4 mb-4 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-2.5 text-xs text-secondary md:mx-6">
          {error}
        </div>
      )}

      {collections.length === 0 ? (
        <section className="flex flex-col items-center px-4 pb-20 pt-4 md:px-8">
          <div className="flex max-w-md flex-col items-center rounded-2xl border border-border/40 bg-card/30 px-8 py-12 text-center">
            <h2 className="text-lg font-semibold">No public collections yet</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              When travelers publish their collections, they&apos;ll appear here for everyone to explore.
            </p>
          </div>
        </section>
      ) : (
        <CollectionsSection collections={collections} title="Public Collections" />
      )}
    </div>
  );
}
