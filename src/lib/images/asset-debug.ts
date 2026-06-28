import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAppBaseUrl,
  getAssetsBaseUrl,
  isLocalDevAppUrl,
  legacyPathToKey,
  resolveAssetUrl,
} from "@/lib/images/assets";

export type ResolutionMode = "r2-public-url" | "worker-cdn-proxy" | "local-filesystem";

export function getResolutionMode(): ResolutionMode {
  if (isLocalDevAppUrl()) {
    if (getAssetsBaseUrl()) return "r2-public-url";
    return "local-filesystem";
  }
  if (getAppBaseUrl()) return "worker-cdn-proxy";
  if (getAssetsBaseUrl()) return "r2-public-url";
  return "local-filesystem";
}

export function describeAssetResolution(stored: string | null | undefined) {
  if (!stored) {
    return {
      stored: null,
      r2Key: null,
      resolvedUrl: null,
      mode: getResolutionMode(),
    };
  }

  const isExternal = stored.startsWith("http://") || stored.startsWith("https://");
  const r2Key = isExternal ? null : legacyPathToKey(stored);
  const appBase = getAppBaseUrl();
  const assetsBase = getAssetsBaseUrl();

  return {
    stored,
    r2Key,
    resolvedUrl: resolveAssetUrl(stored),
    mode: getResolutionMode(),
    steps: isExternal
      ? ["External URL — used as-is"]
      : [
          `DB value → R2 key: ${r2Key}`,
          appBase
            ? `Worker proxy: ${appBase}/cdn/${r2Key}`
            : assetsBase
              ? `Public R2/CDN: ${assetsBase}/${r2Key}`
              : `Local dev: /images_to_use/${r2Key}`,
        ],
  };
}

export async function getRuntimeAssetInfo() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    const cfEnv = env as CloudflareEnv;

    return {
      runtime: "cloudflare-worker" as const,
      bindings: {
        ASSETS_BUCKET: Boolean(cfEnv.ASSETS_BUCKET),
        ASSETS: Boolean(cfEnv.ASSETS),
        NEXT_INC_CACHE_R2_BUCKET: Boolean(cfEnv.NEXT_INC_CACHE_R2_BUCKET),
      },
    };
  } catch {
    return {
      runtime: "nodejs-local" as const,
      bindings: {
        ASSETS_BUCKET: false,
        ASSETS: false,
        NEXT_INC_CACHE_R2_BUCKET: false,
      },
    };
  }
}

export async function getR2BucketOrNull(): Promise<R2Bucket | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    return (env as CloudflareEnv).ASSETS_BUCKET ?? null;
  } catch {
    return null;
  }
}

export async function checkR2Key(key: string) {
  const bucket = await getR2BucketOrNull();
  if (!bucket) {
    return {
      key,
      bucketAvailable: false,
      exists: false,
      error: "ASSETS_BUCKET binding not available (local dev or missing wrangler binding)",
    };
  }

  try {
    const object = await bucket.head(key);
    return {
      key,
      bucketAvailable: true,
      exists: Boolean(object),
      size: object?.size ?? null,
      contentType: object?.httpMetadata?.contentType ?? null,
      uploaded: object?.uploaded?.toISOString?.() ?? null,
    };
  } catch (err) {
    return {
      key,
      bucketAvailable: true,
      exists: false,
      error: err instanceof Error ? err.message : "R2 head failed",
    };
  }
}

export async function listR2Sample(prefix: string, limit = 8) {
  const bucket = await getR2BucketOrNull();
  if (!bucket) {
    return { prefix, bucketAvailable: false, objects: [] as string[] };
  }

  const listed = await bucket.list({ prefix, limit });
  return {
    prefix,
    bucketAvailable: true,
    objects: listed.objects.map((o) => o.key),
    truncated: listed.truncated,
  };
}

export async function getDbImageSamples() {
  const supabase = createAdminClient();

  const [{ data: collections }, { data: places }] = await Promise.all([
    supabase
      .from("collections")
      .select("id, name, cover_image_url")
      .eq("is_deleted", false)
      .not("cover_image_url", "is", null)
      .limit(6),
    supabase
      .from("places")
      .select("id, name, cover_image_url")
      .not("cover_image_url", "is", null)
      .limit(6),
  ]);

  return {
    collections: (collections ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      ...describeAssetResolution(row.cover_image_url),
    })),
    places: (places ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      ...describeAssetResolution(row.cover_image_url),
    })),
  };
}

export function getAssetEnvConfig() {
  const assetsBase = getAssetsBaseUrl();
  const appBase = getAppBaseUrl();

  return {
    NEXT_PUBLIC_ASSETS_BASE_URL: assetsBase || null,
    NEXT_PUBLIC_APP_URL: appBase || null,
    resolutionMode: getResolutionMode(),
    notes: [
      appBase
        ? `R2 keys load via ${appBase}/cdn/{key} — Worker reads ASSETS_BUCKET binding (preferred).`
        : assetsBase
          ? "Images load directly from NEXT_PUBLIC_ASSETS_BASE_URL — must match R2 public/custom domain."
          : "No public URL set — local dev uses /images_to_use/{key}.",
      "ASSETS (static binding) is NOT your R2 bucket — it serves OpenNext JS/CSS only.",
      "ASSETS_BUCKET is the R2 binding for images (bucket: random-sidequest-assets).",
      "NEXT_PUBLIC_* vars are baked in at build time — redeploy after changing them.",
    ],
  };
}
