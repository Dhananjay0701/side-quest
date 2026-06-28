import Link from "next/link";
import { AssetImage } from "@/components/images/asset-image";
import { ExploreScrollRow } from "@/components/explore/explore-scroll-row";
import { ExploreSectionHeader } from "@/components/explore/explore-section-header";
import {
  cardLift,
  explorePageX,
  exploreSectionY,
  imageZoom,
} from "@/components/explore/explore-layout";
import type { ExploreCity } from "@/lib/explore/types";
import { cn } from "@/lib/utils";

interface CityGridProps {
  cities: ExploreCity[];
  title: string;
  desktopTitle?: string;
  subtitle?: string;
  viewAllHref?: string;
  headingId?: string;
}

function CityCircle({ city }: { city: ExploreCity }) {
  return (
    <Link
      href={city.href}
      className={cn(
        "group flex w-[64px] shrink-0 snap-start flex-col items-center gap-1.5",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        "lg:w-[72px]"
      )}
    >
      <div className="h-16 w-16 overflow-hidden rounded-full border border-border/20 transition-colors group-hover:border-border/40 lg:h-[72px] lg:w-[72px]">
        <div className="relative h-full w-full">
          <AssetImage
            src={city.imageUrl}
            alt=""
            sizes="72px"
            cacheTier="idle"
            cacheOnVisible
            className={imageZoom}
          />
        </div>
      </div>
      <span className="text-[10.5px] tracking-wide text-muted/40">{city.name}</span>
    </Link>
  );
}

export function CityGrid({
  cities,
  title,
  desktopTitle,
  subtitle,
  viewAllHref,
  headingId = "city-grid-heading",
}: CityGridProps) {
  return (
    <section aria-labelledby={headingId} className={exploreSectionY}>
      <div className={cn(explorePageX, "mb-3 lg:mb-4")}>
        <ExploreSectionHeader
          id={headingId}
          title={title}
          desktopTitle={desktopTitle}
          subtitle={subtitle}
          href={viewAllHref}
        />
      </div>

      <div className={explorePageX}>
        <ExploreScrollRow ariaLabel="Browse destinations" className="gap-4 lg:gap-6">
          {cities.map((city) => (
            <CityCircle key={city.id} city={city} />
          ))}
        </ExploreScrollRow>
      </div>
    </section>
  );
}
