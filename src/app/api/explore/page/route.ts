import { getPublishedExplorePage } from "@/lib/cms/assemble";
import { apiError, apiSuccess } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/explore/page", async () => {
  try {
    const page = await getPublishedExplorePage();
    if (!page) {
      return apiError("EXPLORE_NOT_CONFIGURED", "Explore page has not been published yet", 404);
    }
    return apiSuccess(page);
  } catch (err) {
    return apiError(
      "EXPLORE_PAGE_ERROR",
      err instanceof Error ? err.message : "Failed to load explore page",
      500
    );
  }
});
