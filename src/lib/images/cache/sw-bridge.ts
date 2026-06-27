import { IMAGE_CACHE_VERSION } from "@/lib/images/cache/constants";
import type { ImageCacheTier } from "@/lib/images/cache/constants";

export interface SwImageCacheStats {
  version: number;
  cacheName: string;
  imageCount: number;
  totalBytes: number;
  oldestCachedAt: number | null;
  newestCachedAt: number | null;
  serviceWorkerHits: number;
  networkHits: number;
  entries: {
    url: string;
    size: number;
    tier: string;
    lastAccess: number;
    cachedAt: number;
  }[];
}

type SwMessage =
  | { type: "REGISTER_URLS"; urls: string[]; tier: ImageCacheTier }
  | { type: "GET_STATS" }
  | { type: "CLEAR_CACHE" }
  | { type: "REFRESH_URLS"; urls: string[]; tier: ImageCacheTier }
  | { type: "RECORD_SW_HIT" }
  | { type: "RECORD_NETWORK_HIT" };

function getController(): ServiceWorker | null {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.controller;
}

function postToSw(message: SwMessage): void {
  const controller = getController();
  controller?.postMessage(message);
}

export function swRegisterUrls(urls: string[], tier: ImageCacheTier): void {
  if (urls.length === 0) return;
  postToSw({ type: "REGISTER_URLS", urls, tier });
}

export function swRefreshUrls(urls: string[], tier: ImageCacheTier): void {
  if (urls.length === 0) return;
  postToSw({ type: "REFRESH_URLS", urls, tier });
}

export function swClearImageCache(): void {
  postToSw({ type: "CLEAR_CACHE" });
}

export function swRecordHit(kind: "sw" | "network"): void {
  postToSw({ type: kind === "sw" ? "RECORD_SW_HIT" : "RECORD_NETWORK_HIT" });
}

export async function swGetStats(): Promise<SwImageCacheStats | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;

  const controller = getController();
  if (!controller) return null;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => resolve(null), 2000);

    channel.port1.onmessage = (event: MessageEvent<SwImageCacheStats>) => {
      window.clearTimeout(timeout);
      resolve(event.data);
    };

    controller.postMessage({ type: "GET_STATS" }, [channel.port2]);
  });
}

export function waitForServiceWorker(): Promise<ServiceWorker | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  return navigator.serviceWorker.ready.then((reg) => reg.active);
}

export function getImageCacheVersion(): number {
  return IMAGE_CACHE_VERSION;
}
