"use client";

import { CollectionsSection } from "@/components/collections/collection-hero-card";
import { HeroSection } from "@/components/home/hero-section";
import { HomePageSkeleton } from "@/components/home/home-page-skeleton";
import { useExploreQuery } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";

export function ExplorePageClient() {
  const exploreQuery = useExploreQuery();
  const collections = exploreQuery.data ?? [];

  const isFirstLoad = exploreQuery.isPending && exploreQuery.data === undefined;
  const isBackgroundRefresh = exploreQuery.isFetching && exploreQuery.data !== undefined;

  if (isFirstLoad) {
    return <HomePageSkeleton />;
  }

  return (
    <div
      className={cn(
        "min-h-screen transition-opacity duration-300 ease-out",
        isBackgroundRefresh && "opacity-[0.98]"
      )}
    >
      <HeroSection />

      {exploreQuery.error && (
        <div className="mx-4 mb-4 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-2.5 text-xs text-secondary md:mx-6">
          {exploreQuery.error.message}
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
        <div className="transition-all duration-300 ease-out">
          <CollectionsSection collections={collections} title="Public Collections" cacheTier="none" />
        </div>
      )}
    </div>
  );
}
