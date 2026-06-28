import { z } from "zod";
import { handleStudioRouteError } from "@/lib/api/studio-error";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/lib/cms/auth";
import { saveCityImage, saveCmsImage } from "@/lib/cms/images";
import { resolveAssetUrl } from "@/lib/images/assets";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/images/save-local-image";
import { profileApiRoute } from "@/lib/debug/profiler";

const formSchema = z.object({
  slug: z.string().min(1).max(80),
  version: z.coerce.number().int().min(1).max(9999).optional(),
  folder: z.enum(["cms", "city_assets"]).default("cms"),
});

export const POST = profileApiRoute("POST", "/api/studio/images/upload", async (req) => {
  try {
    await requireAdmin();

    const form = await req.formData();
    const file = form.get("file");
    const parsed = formSchema.parse({
      slug: form.get("slug"),
      version: form.get("version"),
    });

    if (!(file instanceof File)) {
      return apiError("VALIDATION_ERROR", "Image file is required", 400);
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return apiError("VALIDATION_ERROR", "Only JPEG, PNG, or WebP images are allowed", 400);
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return apiError("VALIDATION_ERROR", "Image must be under 5 MB", 400);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const version = parsed.version ?? 1;
    const key =
      parsed.folder === "city_assets"
        ? await saveCityImage(bytes, file.type, parsed.slug, version)
        : await saveCmsImage(bytes, file.type, parsed.slug, version);

    return apiSuccess({
      key,
      url: resolveAssetUrl(key),
    });
  } catch (err) {
    return handleStudioRouteError(err, "IMAGE_UPLOAD_ERROR", "Failed to upload image");
  }
});
