import Link from "next/link";
import { AssetImage } from "@/components/images/asset-image";
import { CollectionCardText } from "@/components/explore/collection-card-text";
import { ExploreScrollRow } from "@/components/explore/explore-scroll-row";
import { ExploreSectionHeader } from "@/components/explore/explore-section-header";
import {
  cardLift,
  editorialOverlayDiagonal,
  explorePageX,
  exploreSectionY,
  formatCollectionMeta,
  imageZoom,
} from "@/components/explore/explore-layout";
import type { CardTextDisplay } from "@/lib/cms/card-text-display";
import {
  DESKTOP_SCROLL_CARD_TEXT,
  MOBILE_SCROLL_CARD_TEXT,
} from "@/lib/cms/card-text-display";
import type { ExploreCollection } from "@/lib/explore/types";
import { cn } from "@/lib/utils";

interface TrendingCollectionsProps {
  collections: ExploreCollection[];
  title: string;
  desktopTitle?: string;
  subtitle?: string;
  viewAllHref?: string;
  headingId?: string;
  cardTextDesktop?: CardTextDisplay;
  cardTextMobile?: CardTextDisplay;
}

function VerticalTrendingCard({
  collection,
  cardTextDesktop,
  cardTextMobile,
  priorityImage,
  className,
}: {
  collection: ExploreCollection;
  cardTextDesktop: CardTextDisplay;
  cardTextMobile: CardTextDisplay;
  priorityImage?: boolean;
  className?: string;
}) {
  const meta = formatCollectionMeta(collection);

  return (
    <article
      className={cn(
        "group relative aspect-[4/5] shrink-0 snap-start overflow-hidden rounded-2xl shadow-xl shadow-black/40",
        cardLift,
        className
      )}
    >
      <Link
        href={collection.href}
        className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="sr-only">
          {collection.name} — {meta}
        </span>
      </Link>
      <AssetImage
        src={collection.imageUrl}
        alt=""
        sizes="(max-width: 1023px) 42vw, 400px"
        priority={priorityImage}
        cacheTier={priorityImage ? "homepage" : "none"}
        cacheOnVisible={!priorityImage}
        className={imageZoom}
      />
      <div className={cn("pointer-events-none absolute inset-0", editorialOverlayDiagonal)} />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 xl:p-6">
        <div className="space-y-1.5 lg:hidden">
          <CollectionCardText
            display={cardTextMobile}
            name={collection.name}
            vibe={collection.category}
            description={collection.description}
            meta={meta}
            vibeClassName="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40"
            nameClassName="line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-tight tracking-tight text-white"
            descriptionClassName="text-[11px] font-light text-white/50"
            metaClassName="mt-0.5"
          />
        </div>
        <div className="hidden space-y-1.5 lg:block">
          <CollectionCardText
            display={cardTextDesktop}
            name={collection.name}
            vibe={collection.category}
            description={collection.description}
            meta={meta}
            vibeClassName="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40"
            nameClassName="line-clamp-2 min-h-[2.5rem] text-lg font-semibold leading-tight tracking-tight text-white xl:text-lg"
            descriptionClassName="mt-1.5 text-xs font-light text-white/50"
            metaClassName="mt-2"
          />
        </div>
      </div>
    </article>
  );
}

export function TrendingCollections({
  collections,
  title,
  desktopTitle,
  subtitle,
  viewAllHref,
  headingId = "trending-collections-heading",
  cardTextDesktop = DESKTOP_SCROLL_CARD_TEXT,
  cardTextMobile = MOBILE_SCROLL_CARD_TEXT,
}: TrendingCollectionsProps) {
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
        <ExploreScrollRow ariaLabel="Trending collections" className="lg:hidden">
          {collections.map((collection, index) => (
            <VerticalTrendingCard
              key={collection.id}
              collection={collection}
              cardTextDesktop={cardTextDesktop}
              cardTextMobile={cardTextMobile}
              priorityImage={index < 2}
              className="w-[42vw] max-w-[168px]"
            />
          ))}
        </ExploreScrollRow>
      </div>

      <div className={cn(explorePageX, "hidden gap-4 lg:grid lg:grid-cols-3 xl:gap-5")}>
        {collections.map((collection, index) => (
          <VerticalTrendingCard
            key={collection.id}
            collection={collection}
            cardTextDesktop={cardTextDesktop}
            cardTextMobile={cardTextMobile}
            priorityImage={index === 0}
            className="w-full"
          />
        ))}
      </div>
    </section>
  );
}
