/** Data considered fresh — no background refetch during this window. */
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000;

/** In-memory retention after last subscriber unmounts. */
export const QUERY_GC_TIME_MS = 30 * 60 * 1000;

/** Failed request retries (excludes 4xx). */
export const QUERY_RETRY_COUNT = 2;

export const RECENT_PLACES_LIMIT = 12;
