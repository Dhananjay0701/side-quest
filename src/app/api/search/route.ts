import { getAuthProfile } from "@/lib/auth/session";
import { globalSearch } from "@/lib/db/queries/search";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/search", async (req: Request) => {
  try {
    const profile = await getAuthProfile();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const limit = Number(searchParams.get("limit") ?? 20);

    const results = await globalSearch(q, profile?.id ?? null, limit);
    return apiSuccess(results);
  } catch (err) {
    return apiError("SEARCH_ERROR", err instanceof Error ? err.message : "Search failed", 500);
  }
});
