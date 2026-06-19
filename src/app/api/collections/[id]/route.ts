import { AuthError, getAuthProfile, requireAuthProfile } from "@/lib/auth/session";
import { resolveAssetUrl } from "@/lib/images/assets";
import { getCollectionById, getCollectionFilters, isCollectionOwner } from "@/lib/db/queries/collections";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await getAuthProfile();
    const collection = await getCollectionById(id, profile?.id ?? null);
    const filters = await getCollectionFilters(id);

    return apiSuccess({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        placeCount: collection.place_count,
        coverImageUrl: resolveAssetUrl(collection.cover_image_url),
        isPublic: collection.is_public,
      },
      filters,
    });
  } catch (err) {
    return apiError("COLLECTION_ERROR", err instanceof Error ? err.message : "Collection not found", 404);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireAuthProfile();
    const { id } = await params;
    const body = (await req.json()) as {
      isPublic?: boolean;
      name?: string;
      description?: string;
    };

    if (!(await isCollectionOwner(id, profile.id))) {
      return apiError("FORBIDDEN", "Not your collection", 403);
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.isPublic === "boolean") updates.is_public = body.isPublic;
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === "string") updates.description = body.description.trim() || null;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("collections")
      .update(updates)
      .eq("id", id)
      .eq("user_id", profile.id)
      .select("id, is_public, name, description")
      .single();

    if (error || !data) {
      return apiError("UPDATE_ERROR", error?.message ?? "Update failed", 500);
    }

    return apiSuccess({
      id: data.id,
      isPublic: data.is_public,
      name: data.name,
      description: data.description,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError("UNAUTHORIZED", "Sign in required", 401);
    }
    return apiError("UPDATE_ERROR", err instanceof Error ? err.message : "Update failed", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireAuthProfile();
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("collections")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", profile.id)
      .eq("is_deleted", false)
      .select("id")
      .single();

    if (error || !data) {
      return apiError("NOT_FOUND", "Collection not found or already deleted", 404);
    }

    return apiSuccess({ deleted: true, id: data.id });
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError("UNAUTHORIZED", "Sign in required", 401);
    }
    return apiError("DELETE_ERROR", err instanceof Error ? err.message : "Delete failed", 500);
  }
}
