import { getAuthProfile } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";
import { clientIpFromRequest, checkSuggestRateLimit } from "@/lib/search/rate-limit";
import { runSearchPipeline } from "@/lib/search/search-pipeline";
import { recordSearchUsage } from "@/lib/search/usage";
import { suggestQuerySchema } from "@/lib/search/validation";

export const GET = profileApiRoute("GET", "/api/search/suggest", async (req: Request) => {
  try {
    const ip = clientIpFromRequest(req);
    const { allowed } = await checkSuggestRateLimit(`suggest:${ip}`);
    if (!allowed) {
      return apiError("RATE_LIMITED", "Too many search requests. Please try again shortly.", 429);
    }

    const { searchParams } = new URL(req.url);
    const parsed = suggestQuerySchema.safeParse({
      q: searchParams.get("q") ?? "",
      lat: searchParams.get("lat") ?? undefined,
      lng: searchParams.get("lng") ?? undefined,
      sessionToken: searchParams.get("sessionToken") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      hero: searchParams.get("hero") ?? undefined,
    });

    if (!parsed.success) {
      return apiError("INVALID_QUERY", parsed.error.issues[0]?.message ?? "Invalid query", 400);
    }

    const { q, lat, lng, sessionToken, limit, hero } = parsed.data;
    if (!q) {
      const empty = {
        places: [],
        collections: [],
        cities: [],
        external: [],
        providersUsed: [] as const,
      };
      return new Response(JSON.stringify({ data: empty }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=30",
        },
      });
    }

    recordSearchUsage("search", "suggest_request");

    const profile = await getAuthProfile();
    const results = await runSearchPipeline({
      q,
      lat,
      lng,
      sessionToken,
      viewerProfileId: profile?.id ?? null,
      limit,
      heroMode: hero,
    });

    return new Response(JSON.stringify({ data: results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (err) {
    return apiError("SUGGEST_ERROR", err instanceof Error ? err.message : "Suggest failed", 500);
  }
});
