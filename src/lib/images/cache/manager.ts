import {
  IMAGE_CACHE_NAME,
  IMAGE_CACHE_VERSION,
  type ImageCacheTier,
} from "@/lib/images/cache/constants";
import {
  averageImageDecodeTimeMs,
  averageImageLoadTimeMs,
  getImageCacheClientMetrics,
  imageCacheHitRate,
  recordImageCacheHit,
  recordImageCacheMiss,
  recordImageNetworkRequest,
  recordImagePreloaded,
  resetImageCacheClientMetrics,
} from "@/lib/images/cache/observability";
import {
  isCacheableAssetUrl,
  isStaticAssetUrl,
  tierAllowsSwCache,
} from "@/lib/images/cache/policy";
import {
  swClearImageCache,
  swGetStats,
  swRefreshUrls,
  swRegisterUrls,
  type SwImageCacheStats,
} from "@/lib/images/cache/sw-bridge";

export interface ImageCacheStats {
  version: number;
  cacheName: string;
  memoryWarmed: number;
  registeredUrls: number;
  client: ReturnType<typeof getImageCacheClientMetrics>;
  serviceWorker: SwImageCacheStats | null;
  averageLoadMs: number;
  averageDecodeMs: number;
  hitRate: number;
}

const memoryWarmed = new Set<string>();
const registeredUrls = new Set<string>();
const inflightPreload = new Map<string, Promise<void>>();

function warmMemory(url: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (memoryWarmed.has(url)) {
    recordImageCacheHit("memory");
    return Promise.resolve();
  }

  const existing = inflightPreload.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const started = performance.now();
    const img = new Image();
    img.decoding = "async";

    const finish = (hit: "memory" | "browser" | "network") => {
      memoryWarmed.add(url);
      inflightPreload.delete(url);
      if (hit === "network") recordImageNetworkRequest();
      else recordImageCacheHit(hit);
      resolve();
    };

    img.onload = () => {
      const loadMs = performance.now() - started;
      if (img.decode) {
        img.decode().then(() => finish("browser")).catch(() => finish("browser"));
      } else {
        finish("browser");
      }
      void loadMs;
    };

    img.onerror = () => {
      inflightPreload.delete(url);
      recordImageCacheMiss();
      resolve();
    };

    recordImageCacheMiss();
    img.src = url;
  });

  inflightPreload.set(url, promise);
  return promise;
}

function registerWithSw(url: string, tier: ImageCacheTier): void {
  if (!tierAllowsSwCache(tier)) return;
  if (!isCacheableAssetUrl(url) && !isStaticAssetUrl(url)) return;
  registeredUrls.add(url);
  swRegisterUrls([url], tier);
}

/**
 * Central image cache manager — all preload / SW registration flows through here.
 */
export const imageCache = {
  version: IMAGE_CACHE_VERSION,
  cacheName: IMAGE_CACHE_NAME,

  /** Warm browser memory + register with service worker (no hidden DOM) */
  async preload(urls: string[], tier: ImageCacheTier = "homepage"): Promise<void> {
    const unique = [...new Set(urls.filter(Boolean))];
    if (unique.length === 0) return;

    const eligible = unique.filter((url) => isCacheableAssetUrl(url) || isStaticAssetUrl(url));
    recordImagePreloaded(eligible.length);

    swRegisterUrls(eligible, tier);
    eligible.forEach((url) => registeredUrls.add(url));

    await Promise.all(eligible.map((url) => warmMemory(url)));
  },

  /** Scroll-into-view images — participates in LRU via service worker */
  registerViewed(url: string | null | undefined): void {
    if (!url) return;
    registerWithSw(url, "viewed");
    void warmMemory(url);
  },

  /** Collection detail hero — single high-value cover */
  registerCollectionCover(url: string | null | undefined): void {
    if (!url) return;
    registerWithSw(url, "viewed");
    void warmMemory(url);
  },

  /** Idle-time prefetch — low priority */
  prefetchIdle(urls: string[]): void {
    const unique = [...new Set(urls.filter(Boolean))];
    if (unique.length === 0) return;
    swRegisterUrls(unique, "idle");
    unique.forEach((url) => {
      registeredUrls.add(url);
      void warmMemory(url);
    });
  },

  async refresh(urls: string[], tier: ImageCacheTier = "homepage"): Promise<void> {
    const unique = [...new Set(urls.filter(Boolean))];
    swRefreshUrls(unique, tier);
    await this.preload(unique, tier);
  },

  async clear(): Promise<void> {
    memoryWarmed.clear();
    registeredUrls.clear();
    inflightPreload.clear();
    resetImageCacheClientMetrics();
    swClearImageCache();

    if (typeof caches !== "undefined") {
      await caches.delete(IMAGE_CACHE_NAME);
    }
  },

  async getStats(): Promise<ImageCacheStats> {
    const sw = await swGetStats();
    const client = getImageCacheClientMetrics();
    return {
      version: IMAGE_CACHE_VERSION,
      cacheName: IMAGE_CACHE_NAME,
      memoryWarmed: memoryWarmed.size,
      registeredUrls: registeredUrls.size,
      client,
      serviceWorker: sw,
      averageLoadMs: averageImageLoadTimeMs(),
      averageDecodeMs: averageImageDecodeTimeMs(),
      hitRate: imageCacheHitRate(),
    };
  },

  isMemoryWarm(url: string): boolean {
    return memoryWarmed.has(url);
  },
};
