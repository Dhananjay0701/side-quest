import { AuthError, getAuthProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const profile = await getAuthProfile();
    if (!profile) {
      return apiError("UNAUTHORIZED", "Sign in required", 401);
    }

    const { jobId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("import_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", profile.id)
      .single();

    if (error || !data) {
      return apiError("NOT_FOUND", "Import job not found", 404);
    }

    return apiSuccess({
      id: data.id,
      status: data.status,
      fileName: data.file_name,
      stats: data.stats,
      errorMessage: data.error_message,
      collectionId: data.collection_id,
      createdAt: data.created_at,
      completedAt: data.completed_at,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError("UNAUTHORIZED", "Sign in required", 401);
    }
    return apiError("JOB_ERROR", err instanceof Error ? err.message : "Failed to fetch job", 500);
  }
}
