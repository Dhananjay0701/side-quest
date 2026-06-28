import Link from "next/link";
import { AssetImage } from "@/components/images/asset-image";
import { CollectionCardText } from "@/components/explore/collection-card-text";
import { EditorialCue } from "@/components/explore/editorial-cue";
import {
  cardLift,
  editorialOverlay,
  explorePageX,
  formatCollectionMeta,
  imageZoom,
} from "@/components/explore/explore-layout";
import type { CardTextDisplay } from "@/lib/cms/card-text-display";
import {
  DESKTOP_HERO_CARD_TEXT,
  MOBILE_HERO_CARD_TEXT,
} from "@/lib/cms/card-text-display";
import type { ExploreHeroDTO } from "@/lib/cms/types";
import type { FeaturedCollection } from "@/lib/explore/types";
import { cn } from "@/lib/utils";

interface ExploreHeroProps {
  picks: FeaturedCollection[];
  desktop: ExploreHeroDTO["desktop"];
  desktopCardText?: CardTextDisplay;
  mobileCardText?: CardTextDisplay;
  eyebrow?: string;
  headlineLine1?: string;
  headlineLine2?: string;
  headlineEmphasis?: string;
  subtitle?: string;
  editorialHook?: string;
}

type PickVariant = "main" | "stack" | "strip";

function PickCard({
  collection,
  variant,
  cardText,
  priorityImage,
  className,
}: {
  collection: FeaturedCollection;
  variant: PickVariant;
  cardText: CardTextDisplay;
  priorityImage?: boolean;
  className?: string;
}) {
  const isMain = variant === "main";
  const isStrip = variant === "strip";
  const meta = formatCollectionMeta(collection);

  return (
    <article
      className={cn(
        "group relative min-h-0 overflow-hidden rounded-2xl shadow-lg shadow-black/40",
        isMain && "shadow-2xl shadow-black/50",
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
        sizes={
          isMain
            ? "(max-width: 1440px) 40vw, 480px"
            : isStrip
              ? "280px"
              : "(max-width: 1440px) 22vw, 260px"
        }
        priority={priorityImage}
        cacheTier={priorityImage ? "homepage" : "none"}
        cacheOnVisible={!priorityImage}
        className={imageZoom}
      />
      <div className={cn("pointer-events-none absolute inset-0", editorialOverlay)} />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0",
          isStrip ? "p-3" : isMain ? "p-6 xl:p-7" : "p-4"
        )}
      >
        {isMain && collection.editorialCue ? (
          <EditorialCue className="mb-2 hidden text-[9px] tracking-[0.12em] text-primary/70 lg:block">
            {collection.editorialCue}
          </EditorialCue>
        ) : null}
        {isStrip ? (
          <CollectionCardText
            display={cardText}
            name={collection.name}
            vibe={collection.category}
            nameClassName="line-clamp-1 text-sm font-semibold leading-tight tracking-tight text-white"
            vibeClassName="mb-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/45"
          />
        ) : (
          <CollectionCardText
            display={cardText}
            name={collection.name}
            vibe={collection.category}
            description={collection.description}
            meta={meta}
            vibeClassName={cn(
              "font-semibold uppercase tracking-[0.14em] text-white/40",
              isMain ? "mb-1.5 text-[9px]" : "mb-1 text-[9px]"
            )}
            nameClassName={cn(
              "font-semibold leading-tight tracking-tight text-white",
              isMain ? "text-xl xl:text-2xl" : "text-base xl:text-lg"
            )}
            descriptionClassName={cn(
              "mt-1 font-light leading-snug text-white/55",
              isMain ? "text-sm xl:text-base" : "text-[11px] xl:text-xs"
            )}
            metaClassName={cn("mt-1.5 text-[10px]", isMain && "mt-2")}
          />
        )}
      </div>
    </article>
  );
}

function PicksHeader({ cue }: { cue?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between lg:mb-4">
      {cue ? <EditorialCue>{cue}</EditorialCue> : <span />}
      <Link
        href="#"
        className="text-xs font-medium tracking-tight text-muted/30 transition-colors hover:text-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      >
        View all
      </Link>
    </div>
  );
}

export function ExploreHero({
  picks,
  desktop,
  desktopCardText = DESKTOP_HERO_CARD_TEXT,
  mobileCardText = MOBILE_HERO_CARD_TEXT,
  eyebrow = "Curated travel",
  headlineLine1 = "Some places",
  headlineLine2 = "stay with you.",
  headlineEmphasis = "you.",
  subtitle = "Curated places you'll actually remember.",
  editorialHook,
}: ExploreHeroProps) {
  const [pickA, pickB, pickC] = picks;
  const mainPick = pickA ?? desktop.featured.main;
  const secondPick = pickB ?? desktop.featured.stack[0] ?? mainPick;
  const thirdPick = pickC ?? desktop.featured.stack[1] ?? mainPick;
  if (!mainPick) return null;

  const emphasisInLine2 = headlineLine2.includes(headlineEmphasis);

  return (
    <section aria-labelledby="explore-hero-heading" className={cn(explorePageX, "pb-0 pt-4 lg:pt-8")}>
      <div className="lg:hidden">
        <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted/30">
          {eyebrow}
        </p>
        <h1
          id="explore-hero-heading"
          className="max-w-[280px] text-[30px] font-light leading-[1.15] tracking-tight text-foreground"
        >
          {headlineLine1}
          <br />
          {emphasisInLine2 ? (
            <>
              {headlineLine2.replace(headlineEmphasis, "").trim()}{" "}
              <em className="font-normal italic">{headlineEmphasis}</em>
            </>
          ) : (
            headlineLine2
          )}
        </h1>
        <p className="mt-2 max-w-[280px] text-sm font-light tracking-wide text-muted/60">
          {subtitle}
        </p>

        <div className="mt-5">
          <PicksHeader cue={editorialHook ?? mainPick.editorialCue ?? "Editor's Pick"} />
          <div className="grid grid-cols-2 gap-2">
            <PickCard
              collection={mainPick}
              variant="main"
              cardText={mobileCardText}
              priorityImage
              className="col-span-2 aspect-[14/9]"
            />
            <PickCard
              collection={secondPick}
              variant="stack"
              cardText={mobileCardText}
              className="aspect-[1.1]"
            />
            <PickCard
              collection={thirdPick}
              variant="stack"
              cardText={mobileCardText}
              className="aspect-[1.1]"
            />
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <PicksHeader cue={editorialHook ?? desktop.cinematic.editorialCue ?? "Editor's Pick"} />

        <div
          className={cn(
            "grid h-[min(620px,55vh)] min-h-[360px] gap-x-12 xl:gap-x-8",
            "grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)_minmax(300px,0.62fr)]"
          )}
        >
          <div className="flex min-h-0 flex-col pr-10">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted/30">
              {eyebrow}
            </p>
            <h1
              id="explore-hero-heading-desktop"
              className="text-[2rem] font-light leading-[1.1] tracking-tight text-foreground xl:text-4xl "
            >
              {headlineLine1}
              <br />
              {emphasisInLine2 ? (
                <>
                  {headlineLine2.replace(headlineEmphasis, "").trim()}{" "}
                  <em className="font-normal italic">{headlineEmphasis}</em>
                </>
              ) : (
                headlineLine2
              )}
            </h1>
            <p className="mt-2.5 max-w-[260px] text-sm font-light text-muted/60">{subtitle}</p>
            <div className="min-h-5 flex-1" aria-hidden />
          </div>
          <PickCard
            collection={desktop.cinematic}
            variant="main"
            cardText={desktopCardText}
            priorityImage
            className="h-full min-h-0 w-full"
          />
          <div className="flex min-h-0 flex-col gap-3 pl-1 xl:gap-3.5">
            <PickCard
              collection={desktop.featured.stack[0]}
              variant="stack"
              cardText={desktopCardText}
              className="min-h-0 flex-1"
            />
            <PickCard
              collection={desktop.featured.stack[1]}
              variant="stack"
              cardText={desktopCardText}
              className="min-h-0 flex-1"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
