import Link from "next/link";
import { AssetImage } from "@/components/images/asset-image";
import { CollectionCardText } from "@/components/explore/collection-card-text";
import { ExploreSectionHeader } from "@/components/explore/explore-section-header";
import {
  cardLift,
  editorialOverlayDiagonal,
  explorePageX,
  exploreSectionBottom,
  exploreStartHereY,
  formatCollectionMeta,
  imageZoom,
} from "@/components/explore/explore-layout";
import type { CardTextDisplay } from "@/lib/cms/card-text-display";
import {
  DESKTOP_GRID_CARD_TEXT,
  MOBILE_GRID_CARD_TEXT,
} from "@/lib/cms/card-text-display";
import type { ExploreCollection } from "@/lib/explore/types";
import { cn } from "@/lib/utils";

interface OfficialCollectionsProps {
  collections: ExploreCollection[];
  title: string;
  desktopTitle?: string;
  subtitle?: string;
  viewAllHref?: string;
  badgePrefix?: string;
  cardTextDesktop?: CardTextDisplay;
  cardTextMobile?: CardTextDisplay;
}

function formatVibe(category: string, badgePrefix?: string) {
  return badgePrefix ? `${badgePrefix} · ${category}` : category;
}

function StretchedOfficialCard({
  collection,
  cardTextDesktop,
  cardTextMobile,
  priorityImage,
  badgePrefix,
}: {
  collection: ExploreCollection;
  cardTextDesktop: CardTextDisplay;
  cardTextMobile: CardTextDisplay;
  priorityImage?: boolean;
  badgePrefix?: string;
}) {
  const meta = formatCollectionMeta(collection);
  const vibe = formatVibe(collection.category, badgePrefix);

  return (
    <article
      className={cn("group relative h-[158px] shrink-0 overflow-hidden rounded-2xl lg:h-auto", cardLift)}
    >
      <Link
        href={collection.href}
        className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="sr-only">
          {collection.name} — {meta}
        </span>
      </Link>

      <div className="relative h-full lg:grid lg:min-h-[180px] lg:grid-cols-[1.1fr_1fr] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border/10 lg:bg-card/30 lg:shadow-lg lg:shadow-black/20">
        <div className="absolute inset-0 lg:relative lg:min-h-[180px]">
          <AssetImage
            src={collection.imageUrl}
            alt=""
            sizes="(max-width: 1023px) 100vw, 500px"
            priority={priorityImage}
            cacheTier={priorityImage ? "homepage" : "none"}
            cacheOnVisible={!priorityImage}
            className={imageZoom}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 lg:hidden",
              editorialOverlayDiagonal
            )}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-[18px] lg:relative lg:justify-center lg:bg-transparent lg:px-6 lg:py-6 xl:px-8 xl:py-7">
          <div className="space-y-1 lg:hidden">
            <CollectionCardText
              display={cardTextMobile}
              name={collection.name}
              vibe={vibe}
              description={collection.description}
              meta={meta}
              vibeClassName="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35"
              nameClassName="max-w-[220px] text-[17px] font-semibold leading-tight tracking-tight text-white"
              descriptionClassName="max-w-[210px] text-[11.5px] font-light text-white/48"
              metaClassName="mt-1"
            />
          </div>
          <div className="hidden space-y-2 lg:block">
            <CollectionCardText
              display={cardTextDesktop}
              name={collection.name}
              vibe={vibe}
              description={collection.description}
              meta={meta}
              metaLight={false}
              vibeClassName="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/35"
              nameClassName="text-xl font-semibold leading-tight tracking-tight text-foreground xl:text-2xl"
              descriptionClassName="mt-3 text-sm font-light text-muted/55 xl:text-base"
              metaClassName="mt-4 text-foreground/70"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function OfficialCollections({
  collections,
  title,
  desktopTitle,
  subtitle,
  viewAllHref,
  badgePrefix,
  cardTextDesktop = DESKTOP_GRID_CARD_TEXT,
  cardTextMobile = MOBILE_GRID_CARD_TEXT,
}: OfficialCollectionsProps) {
  return (
    <section
      aria-labelledby="official-collections-heading"
      className={cn(explorePageX, exploreStartHereY, exploreSectionBottom)}
    >
      <ExploreSectionHeader
        id="official-collections-heading"
        title={title}
        desktopTitle={desktopTitle}
        subtitle={subtitle}
        href={viewAllHref}
      />

      <div className="flex flex-col gap-2 lg:hidden">
        {collections.map((collection, index) => (
          <StretchedOfficialCard
            key={collection.id}
            collection={collection}
            cardTextDesktop={cardTextDesktop}
            cardTextMobile={cardTextMobile}
            priorityImage={index === 0}
            badgePrefix={badgePrefix}
          />
        ))}
      </div>

      <div className="hidden flex-col gap-4 lg:flex xl:gap-5">
        {collections.map((collection, index) => (
          <StretchedOfficialCard
            key={collection.id}
            collection={collection}
            cardTextDesktop={cardTextDesktop}
            cardTextMobile={cardTextMobile}
            priorityImage={index === 0}
            badgePrefix={badgePrefix}
          />
        ))}
      </div>
    </section>
  );
}
