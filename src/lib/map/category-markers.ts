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

export function getCategoryMarkerEmoji(categorySlug: string | null | undefined): string {
  if (!categorySlug) return CATEGORY_MARKER_EMOJI.other;
  return CATEGORY_MARKER_EMOJI[categorySlug] ?? CATEGORY_MARKER_EMOJI.other;
}

/** Display label for marker — visited places get a check prefix */
export function getMarkerLabel(
  categorySlug: string | null | undefined,
  visitStatus: "saved" | "visited"
): string {
  const emoji = getCategoryMarkerEmoji(categorySlug);
  return visitStatus === "visited" ? `✓${emoji}` : emoji;
}
