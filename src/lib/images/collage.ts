const GRADIENTS = [
  "from-teal-900/80 via-slate-800 to-amber-900/40",
  "from-slate-800 via-teal-950 to-slate-900",
  "from-amber-950/50 via-slate-800 to-teal-900/60",
  "from-slate-900 via-slate-800 to-teal-800/50",
];

/** Default fallback when no cover image was uploaded at import time */
export const DEFAULT_COVER_URL: string | null = "collections/bir.png";

export function getCollectionGradient(id: string): string {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

export function getCollectionInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Used only when import has no user-provided cover image */
export function getPlaceholderCoverUrl(_collectionName: string): string | null {
  return DEFAULT_COVER_URL;
}
