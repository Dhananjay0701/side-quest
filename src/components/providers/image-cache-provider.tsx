"use client";

import { useEffect } from "react";
import { imageCache } from "@/lib/images/cache/manager";
import { waitForServiceWorker } from "@/lib/images/cache/sw-bridge";

const STATIC_ICON_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
];

/**
 * Initializes the image cache pipeline and warms static PWA assets once per session.
 */
export function ImageCacheProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void waitForServiceWorker().then(() => {
      void imageCache.preload(STATIC_ICON_URLS, "static");
    });
  }, []);

  return children;
}
