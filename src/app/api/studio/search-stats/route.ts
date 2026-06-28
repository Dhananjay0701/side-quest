import { handleStudioRouteError } from "@/lib/api/studio-error";
import { apiSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/lib/cms/auth";
import { getSearchStats } from "@/lib/db/queries/search-stats";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/studio/search-stats", async (req: Request) => {
  try {
    await requireAdmin();
    const daysParam = new URL(req.url).searchParams.get("days");
    const periodDays =
      daysParam === "all" || daysParam === null
        ? null
        : Math.max(1, Math.min(365, Number(daysParam) || 7));

    const stats = await getSearchStats(periodDays);
    return apiSuccess(stats);
  } catch (err) {
    return handleStudioRouteError(err, "SEARCH_STATS_ERROR", "Failed to load search stats");
  }
});
