import { AuthError, requireAuthProfile } from "@/lib/auth/session";
import { listUserCollectionsForPicker } from "@/lib/db/queries/places";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";
import { resolveAssetUrl } from "@/lib/images/assets";

export const GET = profileApiRoute("GET", "/api/collections/mine/search", async (req: Request) => {
  try {
    const profile = await requireAuthProfile();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const rows = await listUserCollectionsForPicker(profile.id, q, limit);
    return apiSuccess(
      rows.map((c) => ({
        ...c,
        coverImageUrl: resolveAssetUrl(c.coverImageUrl),
      }))
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError("UNAUTHORIZED", err.message, err.status);
    }
    return apiError("COLLECTIONS_ERROR", err instanceof Error ? err.message : "Search failed", 500);
  }
});
