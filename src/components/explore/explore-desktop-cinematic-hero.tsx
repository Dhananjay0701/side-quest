import Link from "next/link";
import { AssetImage } from "@/components/images/asset-image";
import { CollectionCardText } from "@/components/explore/collection-card-text";
import { EditorialCue } from "@/components/explore/editorial-cue";
import { explorePageX, formatCollectionMeta } from "@/components/explore/explore-layout";
import type { CardTextDisplay } from "@/lib/cms/card-text-display";
import { DESKTOP_HERO_CARD_TEXT } from "@/lib/cms/card-text-display";
import type { FeaturedCollection } from "@/lib/explore/types";
import { cn } from "@/lib/utils";

const HERO_TAGLINE = "Curated places you'll actually remember.";

interface ExploreDesktopCinematicHeroProps {
  collection: FeaturedCollection;
  cardText?: CardTextDisplay;
}

export function ExploreDesktopCinematicHero({
  collection,
  cardText = DESKTOP_HERO_CARD_TEXT,
}: ExploreDesktopCinematicHeroProps) {
  return (
    <section
      aria-labelledby="explore-desktop-hero-heading"
      className={cn(
        explorePageX,
        "relative hidden h-[58vh] m-10 min-h-[420px] max-h-[680px] w-[90vw] overflow-hidden lg:flex lg:items-center lg:py-10 xl:py-12"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] top-0 -z-10 h-[min(480px,55vh)] w-[min(480px,55vh)] rounded-full bg-primary/5 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[12%] -left-[6%] -z-10 h-[min(400px,45vh)] w-[min(400px,45vh)] rounded-full bg-secondary/5 blur-[100px]"
      />

      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-12 items-center gap-8 xl:gap-12">
        <div className="col-span-12 space-y-4 lg:col-span-7 xl:space-y-5">
          {collection.editorialCue && (
            <EditorialCue className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-primary">
              {collection.editorialCue}
            </EditorialCue>
          )}
          <h1
            id="explore-desktop-hero-heading"
            className="max-w-2xl text-[2.75rem] font-light leading-[1.05] tracking-tight text-foreground xl:text-[3.5rem]"
          >
            Some places stay with{" "}
            <em className="font-normal not-italic text-primary drop-shadow-[0_0_24px_rgba(20,184,166,0.35)]">
              you.
            </em>
          </h1>
          <p className="max-w-lg text-base font-light leading-relaxed text-muted/70 xl:text-lg">
            {HERO_TAGLINE}
          </p>
        </div>

        <div className="relative col-span-12 hidden lg:col-span-5 lg:block">
          <Link
            href={collection.href}
            className="group relative block rotate-2 overflow-hidden rounded-3xl shadow-2xl shadow-black/50 motion-safe:transition-transform motion-safe:duration-700 motion-safe:hover:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <div className="relative aspect-[4/5] max-h-[min(50vh,480px)] w-full">
              <AssetImage
                src={collection.imageUrl}
                alt=""
                sizes="(max-width: 1440px) 38vw, 520px"
                priority
                cacheTier="homepage"
                className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.02]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <CollectionCardText
                  display={cardText}
                  name={collection.name}
                  vibe={collection.category}
                  description={collection.description}
                  meta={formatCollectionMeta(collection)}
                  nameClassName="text-lg font-semibold text-white"
                  vibeClassName="text-sm text-white/65"
                  descriptionClassName="mt-1 text-sm text-white/55"
                  metaClassName="mt-1 text-xs text-white/45"
                />
              </div>
            </div>
          </Link>
          <div
            aria-hidden
            className="absolute -bottom-8 -left-10 -z-10 h-40 w-40 rounded-3xl bg-secondary/10 blur-3xl"
          />
        </div>
      </div>
    </section>
  );
}
