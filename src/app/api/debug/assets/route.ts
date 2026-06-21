import { NextRequest } from "next/server";
import {
  checkR2Key,
  describeAssetResolution,
  getAssetEnvConfig,
  getDbImageSamples,
  getRuntimeAssetInfo,
  listR2Sample,
} from "@/lib/images/asset-debug";
import { apiSuccess } from "@/lib/api/response";

/**
 * Image / R2 diagnostics
 *
 * GET /api/debug/assets
 * GET /api/debug/assets?key=collections/bir.png
 * GET /api/debug/assets?stored=/images_to_use/bir.png
 */
export async function GET(req: NextRequest) {
  const keyParam = req.nextUrl.searchParams.get("key");
  const storedParam = req.nextUrl.searchParams.get("stored");

  const [runtime, dbSamples, collectionsList, placesList, avatarsList] =
    await Promise.all([
      getRuntimeAssetInfo(),
      getDbImageSamples(),
      listR2Sample("collections/"),
      listR2Sample("places/"),
      listR2Sample("avatars/"),
    ]);

  const probeKeys = [
    "collections/bir.png",
    ...(keyParam ? [keyParam] : []),
    ...(storedParam ? [describeAssetResolution(storedParam).r2Key].filter(Boolean) : []),
    ...dbSamples.collections.slice(0, 2).map((c) => c.r2Key).filter(Boolean),
    ...dbSamples.places.slice(0, 2).map((p) => p.r2Key).filter(Boolean),
  ] as string[];

  const uniqueProbeKeys = [...new Set(probeKeys)];
  const r2Checks = await Promise.all(uniqueProbeKeys.map((key) => checkR2Key(key)));

  const config = getAssetEnvConfig();

  return apiSuccess({
    help: {
      endpoints: {
        fullReport: "/api/debug/assets",
        resolveStoredPath: "/api/debug/assets?stored=/images_to_use/bir.png",
        checkR2Key: "/api/debug/assets?key=collections/bir.png",
        streamImage: "/cdn/collections/bir.png",
        streamImageDebug: "/cdn/collections/bir.png?debug=1",
      },
      checklist: [
        "1. R2 bucket random-sidequest-assets has objects at collections/, places/, avatars/ prefixes",
        "2. wrangler.jsonc binds ASSETS_BUCKET → random-sidequest-assets (NOT the ASSETS static binding)",
        "3. Set NEXT_PUBLIC_APP_URL to your Worker URL before npm run deploy",
        "4. Either set NEXT_PUBLIC_ASSETS_BASE_URL (R2 public URL) OR use /cdn/* proxy",
        "5. Run supabase/migrations/006_r2_image_keys.sql if DB still has /images_to_use/ paths",
        "6. Redeploy after changing any NEXT_PUBLIC_* variable",
      ],
    },
    config,
    runtime,
    r2Listing: {
      collections: collectionsList,
      places: placesList,
      avatars: avatarsList,
    },
    r2Checks,
    dbSamples,
    ...(storedParam ? { resolveStored: describeAssetResolution(storedParam) } : {}),
    ...(keyParam
      ? { resolveKey: await checkR2Key(keyParam) }
      : {}),
  });
}
