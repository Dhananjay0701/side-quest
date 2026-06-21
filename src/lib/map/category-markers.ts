/** Category slug → map marker emoji */
export const CATEGORY_MARKER_EMOJI: Record<string, string> = {
  restaurant: "🍴",
  cafe: "☕",
  bar: "🍸",
  beach: "🏖️",
  nature: "🌲",
  viewpoint: "🏔️",
  hotel: "🏨",
  activity: "🎯",
  other: "📍",
};

/** Vibrant pin colors per category */
export const CATEGORY_MARKER_COLORS: Record<string, string> = {
  restaurant: "#f97316",
  cafe: "#d97706",
  bar: "#a855f7",
  beach: "#0ea5e9",
  nature: "#22c55e",
  viewpoint: "#6366f1",
  hotel: "#ec4899",
  activity: "#ef4444",
  other: "#14b8a6",
};

export const MARKER_CATEGORY_SLUGS = Object.keys(CATEGORY_MARKER_EMOJI);

export function getCategoryMarkerEmoji(categorySlug: string | null | undefined): string {
  if (!categorySlug) return CATEGORY_MARKER_EMOJI.other;
  return CATEGORY_MARKER_EMOJI[categorySlug] ?? CATEGORY_MARKER_EMOJI.other;
}

export function getCategoryMarkerColor(categorySlug: string | null | undefined): string {
  if (!categorySlug) return CATEGORY_MARKER_COLORS.other;
  return CATEGORY_MARKER_COLORS[categorySlug] ?? CATEGORY_MARKER_COLORS.other;
}

export function getMarkerIconId(
  categorySlug: string | null | undefined,
  visitStatus: "saved" | "visited"
): string {
  const slug = categorySlug && CATEGORY_MARKER_EMOJI[categorySlug] ? categorySlug : "other";
  return `pin-${slug}-${visitStatus}`;
}

/** @deprecated Use getMarkerIconId — kept for GeoJSON text fallback */
export function getMarkerLabel(
  categorySlug: string | null | undefined,
  visitStatus: "saved" | "visited"
): string {
  const emoji = getCategoryMarkerEmoji(categorySlug);
  return visitStatus === "visited" ? `✓${emoji}` : emoji;
}
