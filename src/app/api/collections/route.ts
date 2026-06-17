import { getAuthProfile } from "@/lib/auth/session";
import { getMyCollections } from "@/lib/db/queries/collections";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET() {
  try {
    const profile = await getAuthProfile();
    if (!profile) return apiSuccess([]);

    const collections = await getMyCollections(profile.id);
    return apiSuccess(collections);
  } catch (err) {
    return apiError("COLLECTIONS_ERROR", err instanceof Error ? err.message : "Failed to fetch collections", 500);
  }
}
