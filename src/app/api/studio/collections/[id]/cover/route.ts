import { createAdminClient } from "@/lib/supabase/admin";
import { handleStudioRouteError } from "@/lib/api/studio-error";
import { revalidateExplorePage } from "@/lib/cms/cache";
import { requireAdmin } from "@/lib/cms/auth";
import { resolveAssetUrl } from "@/lib/images/assets";
import { saveImageBufferWithMeta } from "@/lib/images/save-local-image";
import { apiError, apiSuccess } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const POST = profileApiRoute(
  "POST",
  "/api/studio/collections/[id]/cover",
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const profile = await requireAdmin();
      const { id } = await params;

      const supabase = createAdminClient();
      const { data: collection, error: fetchError } = await supabase
        .from("collections")
        .select("id, name, is_public, is_deleted, user_id")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!collection || collection.is_deleted) {
        return apiError("NOT_FOUND", "Collection not found", 404);
      }
      const isOwned = collection.user_id === profile.id;
      if (!collection.is_public && !isOwned) {
        return apiError(
          "FORBIDDEN",
          "Only public collections or collections you own can be updated from Studio",
          403
        );
      }

      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return apiError("INVALID_FILE", "Image file is required", 400);
      }

      const bytes = await file.arrayBuffer();
      const saved = await saveImageBufferWithMeta(
        new Uint8Array(bytes),
        file.type,
        `cover-${id.slice(0, 8)}`
      );
      const storageKey = saved.key;

      const { error: dbError } = await supabase
        .from("collections")
        .update({ cover_image_url: storageKey, cover_source: "upload" })
        .eq("id", id);

      if (dbError) throw dbError;

      revalidateExplorePage();

      return apiSuccess({
        coverImageUrl: resolveAssetUrl(storageKey),
        collectionName: collection.name,
        storageKey,
        storageBackend: saved.backend,
      });
    } catch (err) {
      return handleStudioRouteError(err, "COVER_UPLOAD_ERROR", "Failed to upload cover image");
    }
  }
);
