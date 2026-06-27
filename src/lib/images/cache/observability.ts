import { isProfilingEnabled } from "@/lib/debug/enabled";

export interface ImageLoadSample {
  url: string;
  loadMs: number;
  decodeMs: number;
  bytes?: number;
  at: number;
}

export interface ImageCacheClientMetrics {
  cacheHits: number;
  cacheMisses: number;
  serviceWorkerHits: number;
  browserCacheHits: number;
  networkRequests: number;
  preloaded: number;
  totalLoadMs: number;
  loadSamples: number;
  totalDecodeMs: number;
  decodeSamples: number;
  largest: ImageLoadSample | null;
  slowest: ImageLoadSample | null;
}

const MAX_SAMPLES = 50;

let metrics: ImageCacheClientMetrics = createEmptyMetrics();

function createEmptyMetrics(): ImageCacheClientMetrics {
  return {
    cacheHits: 0,
    cacheMisses: 0,
    serviceWorkerHits: 0,
    browserCacheHits: 0,
    networkRequests: 0,
    preloaded: 0,
    totalLoadMs: 0,
    loadSamples: 0,
    totalDecodeMs: 0,
    decodeSamples: 0,
    largest: null,
    slowest: null,
  };
}

function shouldTrack(): boolean {
  if (typeof window === "undefined") return false;
  return (
    isProfilingEnabled() ||
    process.env.NEXT_PUBLIC_DEBUG_PROFILING === "true" ||
    process.env.NODE_ENV === "development"
  );
}

function trackSample(sample: ImageLoadSample) {
  if (!shouldTrack()) return;
  const slowest = metrics.slowest;
  if (!slowest || sample.loadMs > slowest.loadMs) {
    metrics.slowest = sample;
  }
  if (sample.bytes != null) {
    const largest = metrics.largest;
    if (!largest || (largest.bytes ?? 0) < sample.bytes) {
      metrics.largest = sample;
    }
  }
  if (metrics.loadSamples >= MAX_SAMPLES) return;
}

export function getImageCacheClientMetrics(): ImageCacheClientMetrics {
  return { ...metrics, largest: metrics.largest, slowest: metrics.slowest };
}

export function resetImageCacheClientMetrics(): void {
  metrics = createEmptyMetrics();
}

export function recordImageCacheHit(source: "memory" | "service-worker" | "browser"): void {
  if (!shouldTrack()) return;
  metrics.cacheHits += 1;
  if (source === "service-worker") metrics.serviceWorkerHits += 1;
  if (source === "browser") metrics.browserCacheHits += 1;
}

export function recordImageCacheMiss(): void {
  if (!shouldTrack()) return;
  metrics.cacheMisses += 1;
}

export function recordImageNetworkRequest(): void {
  if (!shouldTrack()) return;
  metrics.networkRequests += 1;
}

export function recordImagePreloaded(count = 1): void {
  if (!shouldTrack()) return;
  metrics.preloaded += count;
}

export function recordImageLoad(args: {
  url: string;
  loadMs: number;
  decodeMs: number;
  bytes?: number;
}): void {
  if (!shouldTrack()) return;
  metrics.totalLoadMs += args.loadMs;
  metrics.loadSamples += 1;
  metrics.totalDecodeMs += args.decodeMs;
  metrics.decodeSamples += 1;
  trackSample({ ...args, at: Date.now() });
}

export function averageImageLoadTimeMs(): number {
  return metrics.loadSamples === 0 ? 0 : metrics.totalLoadMs / metrics.loadSamples;
}

export function averageImageDecodeTimeMs(): number {
  return metrics.decodeSamples === 0 ? 0 : metrics.totalDecodeMs / metrics.decodeSamples;
}

export function imageCacheHitRate(): number {
  const total = metrics.cacheHits + metrics.cacheMisses;
  return total === 0 ? 0 : metrics.cacheHits / total;
}
