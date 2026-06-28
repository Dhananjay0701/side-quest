/** Popularity weights — align with enrichment threshold tuning */
export const POPULARITY_WEIGHTS = {
  editorialFeatured: 10,
  publicCollection: 5,
  userSave: 2,
  view: 1,
} as const;

export function popularityFromSaveCount(saveCount: number): number {
  return saveCount * POPULARITY_WEIGHTS.userSave;
}

export function incrementPopularityOnSave(currentScore: number): number {
  return currentScore + POPULARITY_WEIGHTS.userSave;
}
