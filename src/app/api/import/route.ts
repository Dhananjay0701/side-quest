import { AuthError, requireAuthProfile } from "@/lib/auth/session";
import { parseGoogleMapsCsv, collectionNameFromFilename } from "@/lib/import/parser";
import { runImportPipeline } from "@/lib/import/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveLocalImage } from "@/lib/images/save-local-image";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const POST = profileApiRoute("POST", "/api/import", async (req: Request) => {
  try {
    const profile = await requireAuthProfile();

    const importSecret = process.env.IMPORT_SECRET;
    if (importSecret) {
      const header = req.headers.get("x-import-secret");
      if (header !== importSecret) {
        return apiError("UNAUTHORIZED", "Invalid import secret", 401);
      }
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("INVALID_FILE", "CSV file is required");
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return apiError("INVALID_FILE", "Only CSV files are supported in V0");
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiError("INVALID_FILE", "File exceeds 10MB limit");
    }

    const collectionName =
      (formData.get("collectionName") as string | null)?.trim() ||
      collectionNameFromFilename(file.name);
    const description = (formData.get("description") as string | null)?.trim() || undefined;
    const isPublic = formData.get("isPublic") === "true";

    let coverImageUrl: string | null = null;
    const coverImage = formData.get("coverImage");
    if (coverImage && coverImage instanceof File && coverImage.size > 0) {
      try {
        const slug = collectionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
        coverImageUrl = await saveLocalImage(coverImage, `cover-${slug || "collection"}`);
      } catch (err) {
        return apiError(
          "INVALID_COVER",
          err instanceof Error ? err.message : "Invalid cover image",
          400
        );
      }
    }

    const csvContent = await file.text();
    const normalized = parseGoogleMapsCsv(csvContent, collectionName, description);

    const supabase = createAdminClient();

    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .insert({
        user_id: profile.id,
        status: "queued",
        file_name: file.name,
        file_size_bytes: file.size,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return apiError("JOB_ERROR", jobError?.message ?? "Failed to create import job", 500);
    }

    runImportPipeline({
      userId: profile.id,
      jobId: job.id,
      collection: normalized,
      fileName: file.name,
      coverImageUrl,
      isPublic,
    }).catch(async (err) => {
      await supabase
        .from("import_jobs")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Import failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    });

    return apiSuccess({ jobId: job.id, status: "queued" }, 202);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError("UNAUTHORIZED", "Sign in required", 401);
    }
    return apiError("IMPORT_ERROR", err instanceof Error ? err.message : "Import failed", 500);
  }
});
