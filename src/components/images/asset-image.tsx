"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ImageCacheTier } from "@/lib/images/cache/constants";
import { imageCache } from "@/lib/images/cache/manager";
import {
  recordImageCacheHit,
  recordImageLoad,
  recordImageNetworkRequest,
} from "@/lib/images/cache/observability";
import { resolveAssetUrl } from "@/lib/images/assets";
import { cn } from "@/lib/utils";

export interface AssetImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes: string;
  priority?: boolean;
  cacheTier?: ImageCacheTier;
  /** When true, register with SW cache as the image scrolls into view */
  cacheOnVisible?: boolean;
  placeholderClassName?: string;
}

function AssetImageInner({
  src,
  alt,
  fill = true,
  width,
  height,
  className,
  sizes,
  priority = false,
  cacheTier = "none",
  cacheOnVisible = true,
  placeholderClassName,
}: AssetImageProps) {
  const resolvedSrc = resolveAssetUrl(src) ?? src;
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(() => imageCache.isMemoryWarm(resolvedSrc));
  const registeredRef = useRef(false);

  useEffect(() => {
    setLoaded(imageCache.isMemoryWarm(resolvedSrc));
    registeredRef.current = false;
  }, [resolvedSrc]);

  // Preload may finish after mount; cached images may not fire onLoad.
  useEffect(() => {
    if (loaded) return;
    if (imageCache.isMemoryWarm(resolvedSrc)) {
      setLoaded(true);
      return;
    }

    const timers = [32, 100, 250, 600, 1200].map((ms) =>
      window.setTimeout(() => {
        if (imageCache.isMemoryWarm(resolvedSrc)) setLoaded(true);
      }, ms)
    );

    return () => timers.forEach((id) => clearTimeout(id));
  }, [resolvedSrc, loaded]);

  useEffect(() => {
    if (cacheTier === "homepage" || cacheTier === "static" || cacheTier === "idle") {
      imageCache.registerViewed(resolvedSrc);
    }
    if (cacheTier === "viewed" && !cacheOnVisible) {
      imageCache.registerViewed(resolvedSrc);
    }
  }, [resolvedSrc, cacheTier, cacheOnVisible]);

  useEffect(() => {
    if (!cacheOnVisible || cacheTier === "none" || registeredRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || registeredRef.current) return;
        registeredRef.current = true;
        imageCache.registerViewed(resolvedSrc);
        observer.disconnect();
      },
      { rootMargin: "80px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [resolvedSrc, cacheOnVisible, cacheTier]);

  const loadStartRef = useRef(0);

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      const loadMs = loadStartRef.current
        ? performance.now() - loadStartRef.current
        : 0;

      const markLoaded = (decodeMs: number) => {
        recordImageLoad({ url: resolvedSrc, loadMs, decodeMs });
        setLoaded(true);
      };

      if (imageCache.isMemoryWarm(resolvedSrc)) {
        recordImageCacheHit("memory");
      }

      if (img.decode) {
        const decodeStart = performance.now();
        img
          .decode()
          .then(() => markLoaded(performance.now() - decodeStart))
          .catch(() => markLoaded(0));
      } else {
        markLoaded(0);
      }
    },
    [resolvedSrc]
  );

  const handleLoadStart = useCallback(() => {
    loadStartRef.current = performance.now();
    if (!imageCache.isMemoryWarm(resolvedSrc)) {
      recordImageNetworkRequest();
    }
  }, [resolvedSrc]);

  const imageClassName = cn(
    "object-cover transition-opacity duration-300 ease-out",
    loaded ? "opacity-100" : "opacity-0",
    className
  );

  return (
    <div ref={containerRef} className={fill ? "absolute inset-0" : "relative inline-block"}>
      {!loaded && (
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            fill ? "" : "h-full w-full"
          )}
          aria-hidden
        >
          <div
            className={cn(
              "absolute inset-0 scale-110 bg-gradient-to-br from-card/90 via-border/30 to-card/70 blur-xl",
              placeholderClassName
            )}
          />
        </div>
      )}

      <Image
        src={resolvedSrc}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        unoptimized
        sizes={sizes}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={imageClassName}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onLoadingComplete={() => setLoaded(true)}
      />
    </div>
  );
}

/** Stable, cache-aware image — blur → sharp fade, async decode, viewport registration */
export const AssetImage = memo(AssetImageInner, (prev, next) => {
  return (
    prev.src === next.src &&
    prev.priority === next.priority &&
    prev.cacheTier === next.cacheTier &&
    prev.className === next.className
  );
});

AssetImage.displayName = "AssetImage";
