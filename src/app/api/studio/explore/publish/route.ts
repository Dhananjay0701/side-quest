import { handleStudioRouteError } from "@/lib/api/studio-error";
import { requireAdmin } from "@/lib/cms/auth";
import { publishExploreDraft } from "@/lib/cms/publish";
import { apiSuccess } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const POST = profileApiRoute("POST", "/api/studio/explore/publish", async () => {
  try {
    const profile = await requireAdmin();
    const result = await publishExploreDraft(profile.id);
    return apiSuccess(result);
  } catch (err) {
    return handleStudioRouteError(err, "PUBLISH_ERROR", "Failed to publish explore page");
  }
});
