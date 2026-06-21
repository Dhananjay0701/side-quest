"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight } from "lucide-react";
import { CollectionCardMenu } from "@/components/collections/collection-card-menu";
import { getCollectionGradient, getCollectionInitials } from "@/lib/images/collage";
import { cn } from "@/lib/utils";
import type { CollectionCard } from "@/lib/db/types";

interface CollectionHeroCardProps {
  collection: CollectionCard;
  className?: string;
}

export function CollectionHeroCard({ collection, className }: CollectionHeroCardProps) {
  const gradient = getCollectionGradient(collection.id);
  const initials = getCollectionInitials(collection.name);

  return (
    <div
      className={cn(
        "@container group relative aspect-[4/5] w-[65vw] shrink-0 snap-start",
        "md:w-[clamp(12rem,20vw,20rem)] md:h-[clamp(12rem,10vw,26rem)] lg:w-[clamp(11rem,20vw,22rem)] lg:h-[clamp(11rem,28vw,30.5rem)]",
        //"md:w-[clamp(0rem,10vw,100rem) md:h-[clamp(12rem,22vw,26rem)] lg:w-[clamp(11rem,22vw,17.5rem)], lg:h-[clamp(11rem,27vw,30.5rem)]",
        
        className
      )}
    >
      <Link
        href={`/collections/${collection.id}`}
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[4cqw] border border-border/30 bg-card shadow-xl shadow-black/40 transition-all duration-200 active:scale-[0.99] lg:hover:-translate-y-0.5 lg:hover:border-primary/20"
      >
        <div className="absolute inset-0">
          {collection.coverImageUrl ? (
            <Image
              src={collection.coverImageUrl}
              alt={collection.name}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 767px) 85vw, (max-width: 1023px) 22vw, 16vw"
              priority
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

        {/* Place count badge */}
        <div className="relative p-[4cqw]">
          <span className="inline-block rounded-full bg-black/50 px-[2.5cqw] py-[0.8cqw] text-[3cqw] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            {collection.placeCount} places
          </span>
        </div>

        {/* Bottom content — all sizing via cqw (relative to card width) */}
        <div className="relative mt-auto flex flex-col gap-[2cqw] p-[4cqw]">
          {/* Title + tags share the same left edge */}
          <div className="flex flex-col gap-[1.5cqw]">
            <h2 className="line-clamp-2 text-[6.5cqw] font-semibold leading-snug tracking-tight text-white">
              {collection.name}
            </h2>
            {collection.description && (
            <p className="line-clamp-2 text-[4.3cqw] leading-relaxed text-white/60">
              {collection.description}
            </p>
          )}
            {collection.topTags.length > 0 && (
              <div className="flex flex-wrap gap-[1cqw]">
                {collection.topTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/15 bg-black/30 px-[2cqw] py-[0.6cqw] text-[3.2cqw] font-medium text-white/70 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
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

export function CollectionRow({ collections }: { collections: CollectionCard[] }) {
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
      {collections.map((collection) => (
        <CollectionHeroCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}

export function CollectionsSection({
  collections,
  title = "Your Collections",
}: {
  collections: CollectionCard[];
  title?: string;
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
      <CollectionRow collections={collections} />
    </section>
  );
}
