import type { HeroConfig } from "@/lib/cms/types";

export interface NormalizedHeroCollections {
  cinematicId?: string;
  featuredIds: string[];
  mobileIds: string[];
}

/** Resolve hero collection slots from new fields or legacy `collectionIds`. */
export function normalizeHeroCollections(config: HeroConfig): NormalizedHeroCollections {
  const hasNewFields =
    Boolean(config.cinematicCollectionId) ||
    config.featuredCollectionIds.length > 0 ||
    config.mobileFeaturedCollectionIds.length > 0;

  if (hasNewFields) {
    const featuredIds = config.featuredCollectionIds;
    const mobileIds =
      config.mobileFeaturedCollectionIds.length > 0
        ? config.mobileFeaturedCollectionIds
        : featuredIds;
    return {
      cinematicId: config.cinematicCollectionId,
      featuredIds,
      mobileIds,
    };
  }

  const legacy = config.collectionIds;
  return {
    cinematicId: legacy[0],
    featuredIds: legacy.slice(1, 4),
    mobileIds: legacy.slice(0, 3),
  };
}

export function heroCollectionIdSet(config: HeroConfig): string[] {
  const { cinematicId, featuredIds, mobileIds } = normalizeHeroCollections(config);
  return [...new Set([cinematicId, ...featuredIds, ...mobileIds].filter(Boolean))] as string[];
}
