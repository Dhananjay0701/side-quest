import { getAuthProfile } from "@/lib/auth/session";
import { getMyCollections } from "@/lib/db/queries/collections";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/collections", async () => {
  try {
    const profile = await getAuthProfile();
    if (!profile) return apiSuccess([]);

    const collections = await getMyCollections(profile.id);
    return apiSuccess(collections);
  } catch (err) {
    return apiError("COLLECTIONS_ERROR", err instanceof Error ? err.message : "Failed to fetch collections", 500);
  }
});
