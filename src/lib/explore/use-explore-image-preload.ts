"use client";

import { useEffect, useRef } from "react";
import type { ExplorePageDTO } from "@/lib/cms/types";
import {
  getExploreIdlePreloadUrlsFromDto,
  getExplorePreloadUrlsFromDto,
} from "@/lib/explore/preload-urls";
import { imageCache } from "@/lib/images/cache/manager";

export function useExploreImagePreload(page: ExplorePageDTO | null | undefined) {
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!page) return;

    const priorityUrls = getExplorePreloadUrlsFromDto(page);
    const idleUrls = getExploreIdlePreloadUrlsFromDto(page);
    const key = [...priorityUrls, "|idle|", ...idleUrls].join("|");
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    if (priorityUrls.length > 0) {
      void imageCache.preload(priorityUrls, "homepage");
    }

    if (idleUrls.length === 0) return;

    const preloadCities = () => {
      void imageCache.preload(idleUrls, "idle");
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(preloadCities, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preloadCities, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [page]);
}
