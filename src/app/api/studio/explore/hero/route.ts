import { z } from "zod";
import { handleStudioRouteError } from "@/lib/api/studio-error";
import { requireAdmin } from "@/lib/cms/auth";
import { ensureExploreDraftRevision, getExplorePageId } from "@/lib/cms/queries";
import { updateExploreHero } from "@/lib/cms/publish";
import { apiSuccess } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

const bodySchema = z.object({
  revisionId: z.string().uuid(),
  hero: z.unknown(),
});

export const PATCH = profileApiRoute("PATCH", "/api/studio/explore/hero", async (req) => {
  try {
    const profile = await requireAdmin();
    const body = bodySchema.parse(await req.json());

    await ensureExploreDraftRevision(await getExplorePageId(), profile.id);
    await updateExploreHero(body.revisionId, body.hero, profile.id);

    return apiSuccess({ ok: true });
  } catch (err) {
    return handleStudioRouteError(err, "HERO_UPDATE_ERROR", "Failed to update hero");
  }
});
