import { getPlaces } from "@/lib/db/queries/collections";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/places", async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("collectionId") ?? undefined;
    const q = searchParams.get("q") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const tags = searchParams.get("tags")?.split(",").filter(Boolean);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 500);
    const offset = Number(searchParams.get("offset") ?? 0);

    const { places, total } = await getPlaces({ collectionId, q, category, tags, limit, offset });
    return apiSuccess(places, 200, { total, limit, offset });
  } catch (err) {
    return apiError("PLACES_ERROR", err instanceof Error ? err.message : "Failed to fetch places", 500);
  }
});
