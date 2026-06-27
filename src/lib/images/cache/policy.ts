import type { CollectionCard, PlaceCard } from "@/lib/db/types";
import { STATIC_CACHE_PREFIXES, type ImageCacheTier } from "@/lib/images/cache/constants";

export interface AboveFoldLimits {
  collectionCovers: number;
  /** Homepage SW preload budget */
  recentThumbnails: number;
  /** Above-the-fold priority / eager loading */
  priorityRecentThumbnails: number;
}

/** Viewport-aware above-the-fold counts */
export function getAboveFoldLimits(width = typeof window !== "undefined" ? window.innerWidth : 768): AboveFoldLimits {
  const isMobile = width < 768;
  const isDesktop = width >= 1024;
  return {
    collectionCovers: isMobile ? 3 : isDesktop ? 6 : 4,
    recentThumbnails: isMobile ? 8 : 10,
    priorityRecentThumbnails: isMobile ? 3 : 5,
  };
}

export function isStaticAssetUrl(url: string): boolean {
  try {
    const path = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://localhost").pathname;
    return STATIC_CACHE_PREFIXES.some((prefix) => path.startsWith(prefix));
  } catch {
    return false;
  }
}

export function isCacheableAssetUrl(url: string): boolean {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return false;
  if (isStaticAssetUrl(url)) return true;
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://localhost");
    if (parsed.pathname.startsWith("/cdn/")) return true;
    if (parsed.pathname.startsWith("/images_to_use/")) return true;
    const assetsBase = (process.env.NEXT_PUBLIC_ASSETS_BASE_URL ?? "").replace(/\/$/, "");
    if (assetsBase && url.startsWith(assetsBase)) return true;
    return false;
  } catch {
    return false;
  }
}

export function tierAllowsSwCache(tier: ImageCacheTier): boolean {
  return tier !== "none";
}

export function extractHomepageImageUrls(
  collections: CollectionCard[],
  recentPlaces: PlaceCard[],
  limits = getAboveFoldLimits()
): string[] {
  const urls: string[] = [];

  for (const c of collections.slice(0, limits.collectionCovers)) {
    if (c.coverImageUrl) urls.push(c.coverImageUrl);
  }
  for (const p of recentPlaces.slice(0, limits.recentThumbnails)) {
    if (p.coverImageUrl) urls.push(p.coverImageUrl);
  }

  return [...new Set(urls)];
}

export function extractCollectionCoverUrl(coverImageUrl: string | null | undefined): string[] {
  return coverImageUrl ? [coverImageUrl] : [];
}

export function extractIdlePrefetchUrls(exploreCollections: CollectionCard[], limit = 2): string[] {
  return exploreCollections
    .slice(0, limit)
    .map((c) => c.coverImageUrl)
    .filter((url): url is string => Boolean(url));
}
