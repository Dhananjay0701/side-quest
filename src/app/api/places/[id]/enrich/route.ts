import { AuthError, requireAuthProfile } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";
import { enqueuePlaceEnrichment } from "@/lib/enrich/place-enrichment-worker";

export const POST = profileApiRoute(
  "POST",
  "/api/places/[id]/enrich",
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await requireAuthProfile();
      const { id } = await params;
      const jobId = await enqueuePlaceEnrichment(id, "manual");
      if (!jobId) {
        return apiError("ENRICH_QUEUE_ERROR", "Could not enqueue enrichment", 500);
      }
      return apiSuccess({ jobId, status: "queued" });
    } catch (err) {
      if (err instanceof AuthError) {
        return apiError("UNAUTHORIZED", err.message, err.status);
      }
      return apiError("ENRICH_ERROR", err instanceof Error ? err.message : "Enrichment failed", 500);
    }
  }
);
