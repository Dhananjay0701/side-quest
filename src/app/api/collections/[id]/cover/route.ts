import { AuthError, requireAuthProfile } from "@/lib/auth/session";
import { resolveAssetUrl } from "@/lib/images/assets";
import { isCollectionOwner } from "@/lib/db/queries/collections";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveLocalImage } from "@/lib/images/save-local-image";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireAuthProfile();
    const { id } = await params;

    if (!(await isCollectionOwner(id, profile.id))) {
      return apiError("FORBIDDEN", "Not your collection", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("INVALID_FILE", "Image file is required");
    }

    const storageKey = await saveLocalImage(file, `cover-${id.slice(0, 8)}`);

    const supabase = createAdminClient();
    const { error: dbError } = await supabase
      .from("collections")
      .update({ cover_image_url: storageKey, cover_source: "upload" })
      .eq("id", id)
      .eq("user_id", profile.id)
      .eq("is_deleted", false);

    if (dbError) {
      return apiError("DB_ERROR", dbError.message, 500);
    }

    return apiSuccess({ coverImageUrl: resolveAssetUrl(storageKey) });
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError("UNAUTHORIZED", "Sign in required", 401);
    }
    return apiError(
      "UPLOAD_ERROR",
      err instanceof Error ? err.message : "Upload failed",
      500
    );
  }
}
