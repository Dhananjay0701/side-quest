/**
 * Resolves stored image paths to public URLs.
 *
 * DB may contain:
 * - Legacy local paths: `/images_to_use/foo.jpg`
 * - R2 keys: `collections/foo.jpg`, `places/foo.jpg`, `avatars/foo.jpg`
 * - Full URLs: `https://...`
 */

export type AssetFolder = "collections" | "places" | "avatars" | "cms" | "city_assets";

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

/** Resolve any stored value to a browser-loadable URL */
export function resolveAssetUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;
  // Explicit local dev paths — serve from Next public/ even when R2 base URL is configured
  if (stored.startsWith("/images_to_use/")) return stored;

  const key = legacyPathToKey(stored);
  const publicBase = getAssetsBaseUrl();

  if (publicBase) {
    return `${publicBase}/${key}`;
  }

  const appBase = getAppBaseUrl();
  if (appBase) {
    return `${appBase}/cdn/${key}`;
  }

  return `/images_to_use/${key}`;
}
