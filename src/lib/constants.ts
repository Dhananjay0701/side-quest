export const COLORS = {
  background: "#0F172A",
  card: "#1E293B",
  primary: "#14B8A6",
  secondary: "#F59E0B",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
} as const;

export const CATEGORY_SLUGS = [
  "restaurant",
  "cafe",
  "bar",
  "beach",
  "nature",
  "viewpoint",
  "hotel",
  "activity",
  "other",
] as const;

export const AUDIENCE_OPTIONS = [
  "solo",
  "couples",
  "families",
  "groups",
  "foodies",
  "adventurers",
  "general",
] as const;

export const VIBE_OPTIONS = [
  "chill",
  "lively",
  "romantic",
  "adventurous",
  "cultural",
  "hidden-gem",
  "touristy",
] as const;

export const SESSION_COOKIE = "rs_session";
export const PROMPT_VERSION = "v0.1";
