import type { ExploreCollection } from "@/lib/explore/types";

/** Shared layout tokens for the explore page */
export const explorePageX = "px-[18px] md:px-8 lg:px-12 xl:px-16";
/** Standard gap between sections (tightened for discoverability) */
export const exploreSectionY = "pt-6 lg:pt-10 xl:pt-12";
export const exploreSectionBottom = "pb-6 lg:pb-10 xl:pb-12";
/** Start Here sits ~20–24px below hero */
export const exploreStartHereY = "pt-5 lg:pt-6";

export const editorialOverlay =
  "bg-gradient-to-t from-[#060a12]/92 via-[#060a12]/35 to-[#060a12]/05";

export const editorialOverlayDiagonal =
  "bg-gradient-to-br from-[#060a12]/88 via-[#060a12]/50 to-[#060a12]/10";

export const cardLift =
  "motion-safe:transition-transform motion-safe:duration-300 motion-safe:lg:group-hover:-translate-y-1";

export const imageZoom =
  "motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]";

/** Collection card descriptions — visible on hover/focus/active only (desktop) */
export const cardDescriptionOnHover =
  "hidden overflow-hidden group-hover:block group-focus-within:block group-active:block";

/** Mobile: single teaser line with ellipsis — tap through to the collection */
export const cardDescriptionMobile =
  "line-clamp-1 md:hidden";

/** Image-overlay cards: always one visible line with ellipsis (mobile + desktop) */
export const cardDescriptionOverlay = "line-clamp-1 text-ellipsis";

/** Mobile: reveal extra card copy on tap/hover; always visible from lg up */
export const mobileHoverReveal =
  "hidden overflow-hidden group-hover:block group-focus-within:block group-active:block lg:block";

/** Mobile: one-line description on tap/hover only; desktop keeps overlay line */
export const cardDescriptionMobileHover =
  "line-clamp-1 text-ellipsis hidden group-hover:block group-focus-within:block group-active:block lg:block";

export function formatCollectionMeta(collection: ExploreCollection): string {
  const places = `${collection.placeCount} Places`;
  if (collection.tag) return `${places} · ${collection.tag}`;
  if (collection.duration) return `${places} · ${collection.duration}`;
  return places;
}
