"use client";

import { useState } from "react";
import type { ExplorePageDTO } from "@/lib/cms/types";
import { ExploreSectionRenderer } from "@/components/explore/explore-section-renderer";
import { ExploreCTA } from "@/components/explore/explore-cta";
import { ExploreFilters } from "@/components/explore/explore-filters";
import { ExploreDesktopCinematicHero } from "@/components/explore/explore-desktop-cinematic-hero";
import { ExploreDesktopFeaturedCollections } from "@/components/explore/explore-desktop-featured-collections";
import { ExploreHero } from "@/components/explore/explore-hero";
import { explorePageX } from "@/components/explore/explore-layout";
import { ExplorePageSkeleton } from "@/components/explore/explore-page-skeleton";
import { HeroSearchAutocomplete } from "@/components/search/hero-search-autocomplete";
import { useExplorePageQuery } from "@/lib/query/hooks";
import { useExploreImagePreload } from "@/lib/explore/use-explore-image-preload";
import { cn } from "@/lib/utils";

interface ExplorePageClientProps {
  initialData: ExplorePageDTO | null;
  /** When true, renders draft/static data only — no client refetch of published page */
  previewMode?: boolean;
}

export function ExplorePageClient({ initialData, previewMode = false }: ExplorePageClientProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const exploreQuery = useExplorePageQuery(previewMode ? undefined : initialData, {
    enabled: !previewMode,
  });

  const page = previewMode ? initialData : (exploreQuery.data ?? initialData);
  useExploreImagePreload(page);

  const isFirstLoad = !previewMode && exploreQuery.isPending && !page;
  const isBackgroundRefresh =
    !previewMode && exploreQuery.isFetching && page !== undefined;

  if (isFirstLoad) {
    return <ExplorePageSkeleton />;
  }

  if (!page) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-semibold">Explore is being prepared</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Editorial content has not been published yet. Check back soon.
        </p>
      </div>
    );
  }

  const { hero } = page;

  return (
    <div
      className={cn(
        "min-h-screen [--explore-sticky-top:88px] lg:[--explore-sticky-top:0px]",
        isBackgroundRefresh && "opacity-[0.98] transition-opacity duration-300"
      )}
    >
      <div
        className={cn(
          "sticky top-[var(--explore-sticky-top)] z-40 border-b border-border/10 bg-background/95 backdrop-blur-xl lg:hidden",
          explorePageX
        )}
      >
        <HeroSearchAutocomplete
          className="mb-2 pt-2.5"
          variant="compact"
          placeholder="Search cities, places or experiences…"
        />
        <ExploreFilters
          filters={page.filters}
          activeId={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {hero.visible ? (
        <>
          <div className="lg:hidden">
            <ExploreHero
              picks={hero.picks}
              desktop={hero.desktop}
              desktopCardText={hero.desktopCardText}
              mobileCardText={hero.mobileCardText}
              eyebrow={hero.eyebrow}
              headlineLine1={hero.headlineLine1}
              headlineLine2={hero.headlineLine2}
              headlineEmphasis={hero.headlineEmphasis}
              subtitle={hero.subtitle}
              editorialHook={hero.editorialHook}
            />
          </div>

          {hero.layout !== "mobile_stack" ? (
            <>
              <ExploreDesktopCinematicHero
                collection={hero.desktop.cinematic}
                cardText={hero.desktopCardText}
              />
              <ExploreDesktopFeaturedCollections
                main={hero.desktop.featured.main}
                stack={hero.desktop.featured.stack}
                cardText={hero.desktopCardText}
              />
            </>
          ) : null}
        </>
      ) : null}

      <div className={cn("hidden lg:block", explorePageX, "pb-1 pt-5")}>
        <ExploreFilters
          filters={page.filters}
          activeId={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {page.sections.map((section) => (
        <ExploreSectionRenderer key={section.id} section={section} />
      ))}

      {!page.sections.some((section) => section.layout === "cta") ? <ExploreCTA /> : null}
    </div>
  );
}
