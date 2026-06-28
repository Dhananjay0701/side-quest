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

    if (safeQ) {
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
    }

    const [publicRes, ownedRes] = await Promise.all([
      supabase
        .from("collections")
        .select(selectFields)
        .eq("is_deleted", false)
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(limit),
      supabase
        .from("collections")
        .select(selectFields)
        .eq("is_deleted", false)
        .eq("is_public", false)
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(limit),
    ]);

    if (publicRes.error) throw publicRes.error;
    if (ownedRes.error) throw ownedRes.error;

    const merged = new Map<string, NonNullable<typeof publicRes.data>[number]>();
    for (const row of publicRes.data ?? []) merged.set(row.id as string, row);
    for (const row of ownedRes.data ?? []) merged.set(row.id as string, row);

    const results = [...merged.values()]
      .sort(
        (a, b) =>
          new Date(String(b.updated_at)).getTime() - new Date(String(a.updated_at)).getTime()
      )
      .slice(0, limit);

    return apiSuccess(mapRows(results));
  } catch (err) {
    return handleStudioRouteError(err, "COLLECTION_SEARCH_ERROR", "Failed to search collections");
  }
});
