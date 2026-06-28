import { getCoverSuggestions } from "@/lib/collections/cover-suggestions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/collections/cover-suggestions", async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") ?? undefined;
    const description = searchParams.get("description") ?? undefined;
    const suggestions = await getCoverSuggestions(name, description);
    return apiSuccess(suggestions);
  } catch (err) {
    return apiError(
      "COVER_SUGGESTIONS_ERROR",
      err instanceof Error ? err.message : "Failed to load suggestions",
      500
    );
  }
});
