"use client";

import { useEffect, useRef } from "react";
import type { CollectionCard, PlaceCard } from "@/lib/db/types";
import { imageCache } from "@/lib/images/cache/manager";
import {
  extractHomepageImageUrls,
  extractIdlePrefetchUrls,
  getAboveFoldLimits,
} from "@/lib/images/cache/policy";
import { fetchExploreCollections } from "@/lib/query/fetchers";

/**
 * After homepage JSON loads, preload first-screen images and idle-prefetch likely next views.
 */
export function useHomepageImagePreload(
  collections: CollectionCard[],
  recentPlaces: PlaceCard[],
  enabled: boolean
) {
  const preloadedRef = useRef(false);
  const idleRef = useRef(false);

  useEffect(() => {
    if (!enabled || preloadedRef.current) return;
    if (collections.length === 0 && recentPlaces.length === 0) return;

    preloadedRef.current = true;
    const limits = getAboveFoldLimits();
    const urls = extractHomepageImageUrls(collections, recentPlaces, limits);
    void imageCache.preload(urls, "homepage");
  }, [collections, recentPlaces, enabled]);

  useEffect(() => {
    if (!enabled || idleRef.current) return;

    const runIdle = () => {
      idleRef.current = true;
      void fetchExploreCollections("background")
        .then((explore) => {
          const urls = extractIdlePrefetchUrls(explore, 2);
          imageCache.prefetchIdle(urls);
        })
        .catch(() => undefined);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(runIdle, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = window.setTimeout(runIdle, 2500);
    return () => window.clearTimeout(timer);
  }, [enabled]);
}
