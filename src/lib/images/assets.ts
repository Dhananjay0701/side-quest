/**
 * Resolves stored image paths to public URLs.
 *
 * DB may contain:
 * - Legacy local paths: `/images_to_use/foo.jpg`
 * - R2 keys: `collections/foo.jpg`, `places/foo.jpg`, `avatars/foo.jpg`
 * - Full URLs: `https://...`
 */

export type AssetFolder = "collections" | "places" | "avatars" | "cms" | "city_assets";

/** R2 object key prefixes served via ASSETS_BUCKET /cdn proxy */
export const R2_ASSET_PREFIXES = [
  "collections/",
  "places/",
  "avatars/",
  "cms/",
  "city_assets/",
] as const;

export function isR2AssetKey(key: string): boolean {
  return R2_ASSET_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function getAssetsBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_ASSETS_BASE_URL ?? "").replace(/\/$/, "");
}

export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

/** Map a filename prefix to its R2 folder */
export function assetFolderForPrefix(prefix: string): AssetFolder {
  if (prefix.startsWith("place-") || prefix === "place") return "places";
  if (prefix.startsWith("avatar")) return "avatars";
  return "collections";
}

export function buildStorageKey(prefix: string, filename: string): string {
  return `${assetFolderForPrefix(prefix)}/${filename}`;
}

/** Convert legacy `/images_to_use/` path or bare filename to R2 key */
export function legacyPathToKey(stored: string): string {
  if (
    stored.startsWith("collections/") ||
    stored.startsWith("places/") ||
    stored.startsWith("avatars/") ||
    stored.startsWith("cms/") ||
    stored.startsWith("city_assets/")
  ) {
    return stored;
  }

  const filename = stored.replace(/^\/images_to_use\//, "").replace(/^\//, "");
  if (filename.startsWith("place-")) return `places/${filename}`;
  if (filename.startsWith("avatar-")) return `avatars/${filename}`;
  return `collections/${filename}`;
}

export function isLocalDevAppUrl(): boolean {
  const appBase = getAppBaseUrl();
  if (!appBase) {
    return process.env.NODE_ENV === "development";
  }
  try {
    const host = new URL(appBase).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Pick URL for an R2 object key — CDN on deployed Worker, public R2 or /cdn proxy in dev */
function r2KeyToUrl(key: string): string {
  const publicBase = getAssetsBaseUrl();
  const appBase = getAppBaseUrl();

  if (isLocalDevAppUrl()) {
    if (publicBase) return `${publicBase}/${key}`;
    return `/cdn/${key}`;
  }

  if (appBase) return `${appBase}/cdn/${key}`;
  if (publicBase) return `${publicBase}/${key}`;
  return `/cdn/${key}`;
}

function cdnPathToKey(path: string): string | null {
  const normalized = path.replace(/^\//, "");
  if (!normalized.startsWith("cdn/")) return null;
  const key = normalized.slice("cdn/".length);
  return isR2AssetKey(key) ? key : null;
}

function extractCdnKeyFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    return cdnPathToKey(pathname);
  } catch {
    return null;
  }
}

/** Rewrite stored R2 public URLs to same-origin CDN when deployed on Worker */
function rewritePublicR2Url(url: string): string | null {
  if (isLocalDevAppUrl()) return null;
  const publicBase = getAssetsBaseUrl();
  if (!publicBase || !url.startsWith(publicBase)) return null;
  const key = url.slice(publicBase.length).replace(/^\//, "");
  if (!isR2AssetKey(key)) return null;
  return r2KeyToUrl(key);
}

/** Resolve any stored value to a browser-loadable URL */
export function resolveAssetUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;

  const cdnKey = stored.startsWith("/cdn/")
    ? cdnPathToKey(stored)
    : extractCdnKeyFromUrl(stored);
  if (cdnKey) return r2KeyToUrl(cdnKey);

  if (stored.startsWith("http://") || stored.startsWith("https://")) {
    return rewritePublicR2Url(stored) ?? stored;
  }
  // Explicit local dev paths — serve from Next public/ even when R2 base URL is configured
  if (stored.startsWith("/images_to_use/")) return stored;

  const key = legacyPathToKey(stored);

  if (isR2AssetKey(key)) {
    return r2KeyToUrl(key);
  }

  const publicBase = getAssetsBaseUrl();
  if (publicBase) return `${publicBase}/${key}`;

  return `/images_to_use/${key}`;
}
