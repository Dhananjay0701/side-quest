"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight } from "lucide-react";
import { CollectionCardMenu } from "@/components/collections/collection-card-menu";
import { CollectionCardText } from "@/components/explore/collection-card-text";
import { AssetImage } from "@/components/images/asset-image";
import { getCollectionGradient, getCollectionInitials } from "@/lib/images/collage";
import { getAboveFoldLimits } from "@/lib/images/cache/policy";
import {
  DESKTOP_SCROLL_CARD_TEXT,
  MY_COLLECTIONS_MOBILE_CARD_TEXT,
} from "@/lib/cms/card-text-display";
import { cn } from "@/lib/utils";
import type { CollectionCard } from "@/lib/db/types";
import { useEffect, useState } from "react";

interface CollectionHeroCardProps {
  collection: CollectionCard;
  className?: string;
  priorityImage?: boolean;
  cacheTier?: "homepage" | "none" | "idle";
}

export function CollectionHeroCard({
  collection,
  className,
  priorityImage = false,
  cacheTier = "none",
}: CollectionHeroCardProps) {
  const gradient = getCollectionGradient(collection.id);
  const initials = getCollectionInitials(collection.name);
  const cardTags = [
    `${collection.placeCount} places`,
    ...(collection.topTags ?? []),
  ].slice(0, 4);

  return (
    <div
      className={cn(
        "@container group relative aspect-[4/5] w-[65vw] shrink-0 snap-start",
        "md:w-[clamp(12rem,20vw,20rem)] md:h-[clamp(12rem,10vw,26rem)] lg:w-[clamp(11rem,20vw,22rem)] lg:h-[clamp(11rem,28vw,30.5rem)]",
        className
      )}
    >
      <Link
        href={`/collections/${collection.id}`}
        prefetch
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[4cqw] border border-border/30 bg-card shadow-xl shadow-black/40 transition-all duration-200 active:scale-[0.99] lg:hover:-translate-y-0.5 lg:hover:border-primary/20"
      >
        <div className="absolute inset-0">
          {collection.coverImageUrl ? (
            <AssetImage
              src={collection.coverImageUrl}
              alt={collection.name}
              className="transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 767px) 85vw, (max-width: 1023px) 22vw, 16vw"
              priority={priorityImage}
              cacheTier={cacheTier}
              cacheOnVisible={!priorityImage}
            />
          ) : (
            <div className={cn("h-full w-full bg-gradient-to-br", gradient)}>
              <div className="flex h-full items-center justify-center">
                <span className="select-none text-[22cqw] font-bold tracking-tight text-foreground/10">
                  {initials}
                </span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        </div>

        <div className="relative mt-auto flex flex-col gap-[2cqw] p-[4cqw]">
          <div className="flex flex-col gap-[1.5cqw] lg:hidden">
            <CollectionCardText
              display={MY_COLLECTIONS_MOBILE_CARD_TEXT}
              name={collection.name}
              description={collection.description}
              tags={cardTags}
              nameClassName="line-clamp-2 text-[6.5cqw] font-semibold leading-snug tracking-tight text-white"
              descriptionClassName="text-[4.3cqw] leading-snug text-white/60"
              tagClassName="gap-[1cqw]"
            />
          </div>
          <div className="hidden flex-col gap-[1.5cqw] lg:flex">
            <CollectionCardText
              display={DESKTOP_SCROLL_CARD_TEXT}
              name={collection.name}
              description={collection.description}
              tags={cardTags}
              nameClassName="line-clamp-2 text-[6.5cqw] font-semibold leading-snug tracking-tight text-white"
              descriptionClassName="text-[4.3cqw] leading-snug text-white/60"
              tagClassName="gap-[1cqw]"
            />
          </div>

          <div className="flex justify-end">
            <div className="flex aspect-square w-[11cqw] shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg">
              <ArrowRight className="h-[45%] w-[45%]" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </Link>

      <div className="absolute right-[3cqw] top-[3cqw] z-20">
        <CollectionCardMenu collectionId={collection.id} collectionName={collection.name} />
      </div>
    </div>
  );
}

function useAboveFoldCollectionLimit() {
  const [limit, setLimit] = useState(() => getAboveFoldLimits().collectionCovers);

  useEffect(() => {
    const update = () => setLimit(getAboveFoldLimits().collectionCovers);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return limit;
}

export function CollectionRow({
  collections,
  cacheTier = "none",
}: {
  collections: CollectionCard[];
  cacheTier?: "homepage" | "none" | "idle";
}) {
  const aboveFoldLimit = useAboveFoldCollectionLimit();
  if (collections.length === 0) return null;

  return (
    <div
      className={cn(
        "scrollbar-hide flex snap-x snap-mandatory overflow-x-auto pb-[1.5vw] pt-[0.5vw]",
        "gap-[2.5vw] pl-[4vw] pr-[4vw]",
        "md:gap-[2vw] md:px-[4vw]",
        "lg:gap-[1.5vw] "
      )}
    >
      {collections.map((collection, index) => (
        <CollectionHeroCard
          key={collection.id}
          collection={collection}
          priorityImage={index < aboveFoldLimit}
          cacheTier={cacheTier}
        />
      ))}
    </div>
  );
}

export function CollectionsSection({
  collections,
  title = "Your Collections",
  cacheTier = "none",
}: {
  collections: CollectionCard[];
  title?: string;
  cacheTier?: "homepage" | "none" | "idle";
}) {
  if (collections.length === 0) return null;

  return (
    <section className="px-[4vw] pb-[3vw] md:px-[4vw] md:pb-[0vw]">
      <div className="mb-[2vw] flex items-center justify-between md:mb-[1.5vw]">
        <div className="flex items-center gap-[1vw]">
          <div className="flex aspect-square w-[4.5vw] max-w-7 min-w-5 items-center justify-center rounded-md bg-primary/10 text-primary md:max-w-8">
            <BookOpen className="h-[55%] w-[55%]" strokeWidth={2} />
          </div>
          <h2 className="text-[clamp(0.875rem,1.25vw,2rem)] font-semibold">{title}</h2>
        </div>
        <button className="hidden items-center gap-[0.5vw] text-[clamp(0.7rem,1.8vw,0.8rem)] text-muted/70 transition-colors hover:text-muted md:flex">
          View all <ChevronRight className="h-[1.2em] w-[1.2em]" />
        </button>
      </div>
      <CollectionRow collections={collections} cacheTier={cacheTier} />
    </section>
  );
}
