import { z } from "zod";

/** Studio toggles for collection card overlay copy */
export const cardTextDisplaySchema = z.object({
  showName: z.boolean().default(true),
  showVibe: z.boolean().default(true),
  /** When false, clamp description to one line with ellipsis */
  descriptionFull: z.boolean().default(false),
  /** When true, description is always visible (per descriptionFull). When false, reveal on hover/tap only */
  descriptionWithoutHover: z.boolean().default(false),
});

export type CardTextDisplay = z.infer<typeof cardTextDisplaySchema>;

export const cardTextDisplayPairSchema = z.object({
  desktop: cardTextDisplaySchema.optional(),
  mobile: cardTextDisplaySchema.optional(),
});

export type CardTextDisplayPair = z.infer<typeof cardTextDisplayPairSchema>;

export const DESKTOP_HERO_CARD_TEXT: CardTextDisplay = {
  showName: true,
  showVibe: true,
  descriptionFull: false,
  descriptionWithoutHover: true,
};

export const MOBILE_HERO_CARD_TEXT: CardTextDisplay = {
  showName: true,
  showVibe: true,
  descriptionFull: false,
  descriptionWithoutHover: false,
};

export const DESKTOP_SCROLL_CARD_TEXT: CardTextDisplay = {
  showName: true,
  showVibe: true,
  descriptionFull: false,
  descriptionWithoutHover: true,
};

export const MOBILE_SCROLL_CARD_TEXT: CardTextDisplay = {
  showName: true,
  showVibe: true,
  descriptionFull: false,
  descriptionWithoutHover: false,
};

/** Desktop originals — full description allowed */
export const DESKTOP_GRID_CARD_TEXT: CardTextDisplay = {
  showName: true,
  showVibe: true,
  descriptionFull: true,
  descriptionWithoutHover: true,
};

export const MOBILE_GRID_CARD_TEXT: CardTextDisplay = {
  showName: true,
  showVibe: true,
  descriptionFull: false,
  descriptionWithoutHover: false,
};

export const MY_COLLECTIONS_MOBILE_CARD_TEXT: CardTextDisplay = MOBILE_SCROLL_CARD_TEXT;

const hoverReveal =
  "hidden group-hover:block group-focus-within:block group-active:block";

/** Single-line clamp — keep separate from hoverReveal (block breaks -webkit-box) */
export const descriptionClampClass = "line-clamp-1 overflow-hidden text-ellipsis";

export function descriptionSizeClass(display: CardTextDisplay): string {
  return display.descriptionFull ? "" : descriptionClampClass;
}

export function parseCardTextDisplay(
  value: unknown,
  fallback: CardTextDisplay
): CardTextDisplay {
  const parsed = cardTextDisplaySchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export function resolveCardTextPair(
  pair: CardTextDisplayPair | undefined,
  defaults: { desktop: CardTextDisplay; mobile: CardTextDisplay }
): { desktop: CardTextDisplay; mobile: CardTextDisplay } {
  return {
    desktop: parseCardTextDisplay(pair?.desktop, defaults.desktop),
    mobile: parseCardTextDisplay(pair?.mobile, defaults.mobile),
  };
}

export function descriptionVisibilityClass(display: CardTextDisplay): string {
  return display.descriptionWithoutHover ? "" : hoverReveal;
}

export function metaVisibilityClass(display: CardTextDisplay): string {
  return display.descriptionWithoutHover ? "" : hoverReveal;
}

export function showAtBreakpoint(showMobile: boolean, showDesktop: boolean): string {
  if (!showMobile && !showDesktop) return "hidden";
  if (showMobile && showDesktop) return "";
  if (showMobile) return "lg:hidden";
  return "hidden lg:block";
}
