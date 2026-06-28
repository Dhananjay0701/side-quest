import { getR2BucketOrNull } from "@/lib/images/asset-debug";
import { getAssetsBaseUrl } from "@/lib/images/assets";
import { isR2S3Configured, probeR2S3 } from "@/lib/images/r2-s3-upload";
import { handleStudioRouteError } from "@/lib/api/studio-error";
import { requireAdmin } from "@/lib/cms/auth";
import { apiSuccess } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

/** GET /api/studio/r2-status — diagnose R2 upload connectivity for local dev */
export const GET = profileApiRoute("GET", "/api/studio/r2-status", async () => {
  try {
    await requireAdmin();

    const [binding, s3Probe] = await Promise.all([getR2BucketOrNull(), probeR2S3()]);

    return apiSuccess({
      runtime: binding ? "cloudflare-worker" : "nodejs-local",
      workerBindingAvailable: Boolean(binding),
      s3Api: s3Probe,
      assetsPublicBaseUrl: getAssetsBaseUrl() || null,
      hints: [
        binding
          ? "ASSETS_BUCKET binding is active. In `npm run dev` with OpenNext, this is often a LOCAL Miniflare bucket — uploads go to real R2 via S3 API when R2_* env vars are set."
          : "No ASSETS_BUCKET binding (normal for plain next dev). Uploads use R2 S3 API if configured.",
        s3Probe.headBucketOk
          ? `R2 S3 API can reach bucket "${s3Probe.bucket}".`
          : s3Probe.configured
            ? `R2 S3 API failed: ${s3Probe.error}`
            : "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local and restart dev server.",
        "Use an R2 API token with Object Read & Write on random-sidequest-assets (not the Cloudflare dashboard API token).",
        "After changing .env.local, restart `npm run dev`.",
      ],
    });
  } catch (err) {
    return handleStudioRouteError(err, "R2_STATUS_ERROR", "Failed to check R2 status");
  }
});
