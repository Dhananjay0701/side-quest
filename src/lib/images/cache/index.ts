export {
  IMAGE_CACHE_NAME,
  IMAGE_CACHE_VERSION,
  MAX_CACHE_BYTES,
  MAX_CACHE_COUNT,
  type ImageCacheTier,
} from "@/lib/images/cache/constants";
export { imageCache, type ImageCacheStats } from "@/lib/images/cache/manager";
export {
  extractCollectionCoverUrl,
  extractHomepageImageUrls,
  extractIdlePrefetchUrls,
  getAboveFoldLimits,
  isCacheableAssetUrl,
  isStaticAssetUrl,
  tierAllowsSwCache,
  type AboveFoldLimits,
} from "@/lib/images/cache/policy";
export {
  averageImageDecodeTimeMs,
  averageImageLoadTimeMs,
  getImageCacheClientMetrics,
  imageCacheHitRate,
  recordImageCacheHit,
  recordImageCacheMiss,
  recordImageLoad,
  recordImageNetworkRequest,
  recordImagePreloaded,
  resetImageCacheClientMetrics,
} from "@/lib/images/cache/observability";
export { useHomepageImagePreload } from "@/lib/images/cache/use-homepage-preload";
export { swGetStats, type SwImageCacheStats } from "@/lib/images/cache/sw-bridge";
