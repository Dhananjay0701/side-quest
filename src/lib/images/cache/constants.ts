/** Keep in sync with public/sw-image-cache.js */
export const IMAGE_CACHE_VERSION = 1;

export const IMAGE_CACHE_NAME = `rsq-images-v${IMAGE_CACHE_VERSION}`;

/** Hard limits — LRU evicts when either is exceeded */
export const MAX_CACHE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_CACHE_COUNT = 40;

export const META_DB_NAME = "rsq-image-cache-meta";
export const META_STORE = "entries";

/** Same-origin paths always eligible for SW cache-first */
export const STATIC_CACHE_PREFIXES = ["/icons/", "/splash/"] as const;

export type ImageCacheTier = "static" | "homepage" | "viewed" | "idle" | "none";
