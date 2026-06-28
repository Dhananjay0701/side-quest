import Link from "next/link";
import { AssetImage } from "@/components/images/asset-image";
import { CollectionCardText } from "@/components/explore/collection-card-text";
import {
  cardLift,
  editorialOverlay,
  explorePageX,
  exploreSectionBottom,
  formatCollectionMeta,
  imageZoom,
} from "@/components/explore/explore-layout";
import type { CardTextDisplay } from "@/lib/cms/card-text-display";
import { DESKTOP_HERO_CARD_TEXT } from "@/lib/cms/card-text-display";
import type { FeaturedCollection } from "@/lib/explore/types";
import { cn } from "@/lib/utils";

interface ExploreDesktopFeaturedCollectionsProps {
  main: FeaturedCollection;
  stack: readonly [FeaturedCollection, FeaturedCollection];
  cardText?: CardTextDisplay;
}

function FeaturedMainCard({
  collection,
  cardText,
}: {
  collection: FeaturedCollection;
  cardText: CardTextDisplay;
}) {
  const meta = formatCollectionMeta(collection);

  return (
    <article
      className={cn(
        "group relative h-full min-h-0 cursor-pointer overflow-hidden rounded-[2rem] shadow-2xl shadow-black/45 lg:col-span-2",
        cardLift
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
        sizes="(max-width: 1440px) 58vw, 760px"
        priority
        cacheTier="homepage"
        className={cn(imageZoom, "motion-safe:duration-1000 motion-safe:group-hover:scale-105")}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] motion-safe:transition-opacity motion-safe:duration-500 motion-safe:group-hover:opacity-90",
          editorialOverlay
        )}
      />
      <div className="relative z-[2] flex h-full flex-col justify-end p-10 xl:p-12">
        <div className="max-w-xl space-y-3">
          <CollectionCardText
            display={cardText}
            name={collection.name}
            vibe={collection.category}
            description={collection.description}
            meta={meta}
            vibeClassName="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45"
            nameClassName="text-4xl font-light leading-tight tracking-tight text-white xl:text-5xl"
            descriptionClassName="text-sm font-light text-white/55 xl:text-base"
            metaClassName="text-[10px] text-white/40"
          />
        </div>
      </div>
    </article>
  );
}

function FeaturedStackCard({
  collection,
  cardText,
}: {
  collection: FeaturedCollection;
  cardText: CardTextDisplay;
}) {
  const meta = formatCollectionMeta(collection);

  return (
    <article
      className={cn(
        "group relative min-h-0 flex-1 cursor-pointer overflow-hidden rounded-[2rem] shadow-xl shadow-black/40",
        cardLift
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
        sizes="(max-width: 1440px) 28vw, 360px"
        cacheOnVisible
        className={cn(imageZoom, "motion-safe:duration-700 motion-safe:group-hover:scale-110")}
      />
      <div className={cn("pointer-events-none absolute inset-0", editorialOverlay)} />
      <div className="absolute inset-x-0 bottom-0 space-y-1 p-7 xl:p-8">
        <CollectionCardText
          display={cardText}
          name={collection.name}
          vibe={collection.category}
          description={collection.description}
          meta={meta}
          vibeClassName="text-[10px] font-medium uppercase tracking-[0.16em] text-white/40"
          nameClassName="text-xl font-semibold tracking-tight text-white xl:text-2xl"
          descriptionClassName="text-xs text-white/50"
          metaClassName="text-xs text-white/50"
        />
      </div>
    </article>
  );
}

export function ExploreDesktopFeaturedCollections({
  main,
  stack,
  cardText = DESKTOP_HERO_CARD_TEXT,
}: ExploreDesktopFeaturedCollectionsProps) {
  const [top, bottom] = stack;

  return (
    <section
      aria-labelledby="explore-desktop-featured-heading"
      className={cn(explorePageX, exploreSectionBottom, "hidden pt-4 lg:block lg:pt-5")}
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-10 flex items-end justify-between xl:mb-12">
          <div>
            <h2
              id="explore-desktop-featured-heading"
              className="text-3xl font-light tracking-tight text-foreground xl:text-4xl"
            >
              Featured this week
            </h2>
          </div>
        </div>

        <div className="grid min-h-[min(520px,48vh)] grid-cols-1 gap-5 lg:grid-cols-3 xl:gap-6">
          <FeaturedMainCard collection={main} cardText={cardText} />
          <div className="flex min-h-0 flex-col gap-5 xl:gap-6">
            <FeaturedStackCard collection={top} cardText={cardText} />
            <FeaturedStackCard collection={bottom} cardText={cardText} />
          </div>
        </div>
      </div>
    </section>
  );
}
