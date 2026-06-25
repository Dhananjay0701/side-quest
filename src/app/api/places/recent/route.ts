import { getAuthProfile } from "@/lib/auth/session";
import { getRecentPlaces } from "@/lib/db/queries/collections";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/places/recent", async (req: Request) => {
  try {
    const profile = await getAuthProfile();
    if (!profile) return apiSuccess([]);

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 12);
    const places = await getRecentPlaces(profile.id, limit);
    return apiSuccess(places);
  } catch (err) {
    return apiError(
      "RECENT_ERROR",
      err instanceof Error ? err.message : "Failed to fetch recent places",
      500
    );
  }
});
