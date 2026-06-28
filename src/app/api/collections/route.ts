import { getAuthProfile, requireAuthProfile, AuthError } from "@/lib/auth/session";
import { createCollection, getMyCollections } from "@/lib/db/queries/collections";
import { getPlaceholderCoverUrl } from "@/lib/images/collage";
import { saveLocalImage } from "@/lib/images/save-local-image";
import { isR2AssetKey } from "@/lib/images/assets";
import { createCollectionSchema } from "@/lib/collections/validation";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/collections", async () => {
  try {
    const profile = await getAuthProfile();
    if (!profile) return apiSuccess([]);

    const collections = await getMyCollections(profile.id);
    return apiSuccess(collections);
  } catch (err) {
    return apiError("COLLECTIONS_ERROR", err instanceof Error ? err.message : "Failed to fetch collections", 500);
  }
});

export const POST = profileApiRoute("POST", "/api/collections", async (req: Request) => {
  try {
    const profile = await requireAuthProfile();
    const contentType = req.headers.get("content-type") ?? "";

    let name = "";
    let description: string | undefined;
    let tags: string[] | undefined;
    let coverKey: string | undefined;
    let isPublic = false;
    let coverFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      name = String(formData.get("name") ?? "");
      description = String(formData.get("description") ?? "") || undefined;
      const tagsRaw = String(formData.get("tags") ?? "");
      if (tagsRaw) {
        try {
          const parsed = JSON.parse(tagsRaw) as unknown;
          if (Array.isArray(parsed)) tags = parsed.map(String);
        } catch {
          tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
      coverKey = String(formData.get("coverKey") ?? "") || undefined;
      isPublic = formData.get("isPublic") === "true";
      const file = formData.get("coverImage");
      if (file instanceof File && file.size > 0) coverFile = file;
    } else {
      const body = (await req.json()) as Record<string, unknown>;
      const parsed = createCollectionSchema.safeParse(body);
      if (!parsed.success) {
        return apiError("INVALID_BODY", parsed.error.issues[0]?.message ?? "Invalid request", 400);
      }
      name = parsed.data.name;
      description = parsed.data.description;
      tags = parsed.data.tags;
      coverKey = parsed.data.coverKey;
      isPublic = parsed.data.isPublic ?? false;
    }

    const validated = createCollectionSchema.safeParse({ name, description, tags, coverKey, isPublic });
    if (!validated.success) {
      return apiError("INVALID_BODY", validated.error.issues[0]?.message ?? "Invalid request", 400);
    }

    let coverImageUrl: string | null = null;
    let coverSource = "collage";

    if (coverFile) {
      coverImageUrl = await saveLocalImage(coverFile, `cover-${profile.id.slice(0, 8)}`);
      coverSource = "upload";
    } else if (coverKey && isR2AssetKey(coverKey)) {
      coverImageUrl = coverKey;
      coverSource = "suggestion";
    } else {
      coverImageUrl = getPlaceholderCoverUrl(name);
      coverSource = coverImageUrl ? "placeholder" : "collage";
    }

    const collection = await createCollection(profile.id, {
      name: validated.data.name,
      description: validated.data.description,
      tags: validated.data.tags,
      coverImageUrl,
      coverSource,
      isPublic: validated.data.isPublic,
    });

    return apiSuccess(collection, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError("UNAUTHORIZED", err.message, err.status);
    }
    return apiError(
      "CREATE_COLLECTION_ERROR",
      err instanceof Error ? err.message : "Failed to create collection",
      500
    );
  }
});
