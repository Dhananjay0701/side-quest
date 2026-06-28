export function getSearchConfig() {
  return {
    enrichSaveThreshold: Number(process.env.ENRICH_SAVE_THRESHOLD ?? 2),
    enrichPopularityThreshold: Number(process.env.ENRICH_POPULARITY_THRESHOLD ?? 4),
    localMinHits: Number(process.env.SEARCH_LOCAL_MIN_HITS ?? 3),
    googleAutocompleteEnabled: process.env.SEARCH_GOOGLE_ENABLED !== "false",
    suggestRateLimitPerMin: Number(process.env.SEARCH_SUGGEST_RATE_LIMIT_PER_MIN ?? 30),
    autocompleteCacheTtlMinutes: Number(process.env.SEARCH_AUTOCOMPLETE_CACHE_TTL_MIN ?? 30),
  };
}
