import { getPlaces } from "@/lib/db/queries/collections";
import { createOrLinkPlace } from "@/lib/db/queries/places";
import { AuthError, requireAuthProfile } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";
import { createPlaceSchema } from "@/lib/search/validation";

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

export const POST = profileApiRoute("POST", "/api/places", async (req: Request) => {
  try {
    const profile = await requireAuthProfile();
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = createPlaceSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("INVALID_BODY", parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const sessionToken =
      typeof body.sessionToken === "string" ? body.sessionToken : undefined;

    const result = await createOrLinkPlace(parsed.data, profile.id, sessionToken);
    return apiSuccess(result, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError("UNAUTHORIZED", err.message, err.status);
    }
    return apiError("CREATE_PLACE_ERROR", err instanceof Error ? err.message : "Failed to add place", 500);
  }
});
