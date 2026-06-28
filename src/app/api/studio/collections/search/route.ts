import { createAdminClient } from "@/lib/supabase/admin";
import { handleStudioRouteError } from "@/lib/api/studio-error";
import { requireAdmin } from "@/lib/cms/auth";
import { resolveAssetUrl } from "@/lib/images/assets";
import { apiSuccess } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/studio/collections/search", async (req) => {
  try {
    const profile = await requireAdmin();

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limitRaw = Number(url.searchParams.get("limit") ?? 20);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 50);
    const safeQ = q.replace(/[%_,().]/g, "").slice(0, 100);

    const supabase = createAdminClient();

    function mapRows(
      rows: Array<{
        id: string;
        name: string;
        description: string | null;
        place_count: number;
        cover_image_url: string | null;
        is_public: boolean;
        user_id: string;
      }>
    ) {
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        placeCount: row.place_count,
        coverImageUrl: resolveAssetUrl(row.cover_image_url),
        isPublic: row.is_public,
        isOwned: row.user_id === profile.id,
      }));
    }

    const selectFields =
      "id, name, description, place_count, cover_image_url, is_public, user_id, updated_at";

    if (!safeQ) {
      return apiSuccess([]);
    }

    const { data, error } = await supabase
      .from("collections")
      .select(selectFields)
      .eq("is_deleted", false)
      .or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const filtered = (data ?? []).filter(
      (row) => row.is_public || row.user_id === profile.id
    );
    return apiSuccess(mapRows(filtered));
  } catch (err) {
    return handleStudioRouteError(err, "COLLECTION_SEARCH_ERROR", "Failed to search collections");
  }
});
