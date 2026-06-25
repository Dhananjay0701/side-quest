import { getPublicCollections } from "@/lib/db/queries/collections";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/explore", async () => {
  try {
    const collections = await getPublicCollections();
    return apiSuccess(collections);
  } catch (err) {
    return apiError(
      "EXPLORE_ERROR",
      err instanceof Error ? err.message : "Failed to fetch public collections",
      500
    );
  }
});
