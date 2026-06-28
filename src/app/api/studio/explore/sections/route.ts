import { z } from "zod";
import { handleStudioRouteError } from "@/lib/api/studio-error";
import { requireAdmin } from "@/lib/cms/auth";
import { ensureExploreDraftRevision, getExplorePageId } from "@/lib/cms/queries";
import { createSection, reorderSections } from "@/lib/cms/sections";
import { apiSuccess } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

const createSchema = z.object({
  revisionId: z.string().uuid(),
  section: z.unknown(),
});

const reorderSchema = z.object({
  revisionId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const POST = profileApiRoute("POST", "/api/studio/explore/sections", async (req) => {
  try {
    const profile = await requireAdmin();
    const body = createSchema.parse(await req.json());
    const pageId = await getExplorePageId();

    await ensureExploreDraftRevision(pageId, profile.id);
    const section = await createSection(body.revisionId, pageId, body.section, profile.id);

    return apiSuccess(section);
  } catch (err) {
    return handleStudioRouteError(err, "SECTION_CREATE_ERROR", "Failed to create section");
  }
});

export const PATCH = profileApiRoute("PATCH", "/api/studio/explore/sections", async (req) => {
  try {
    const profile = await requireAdmin();
    const body = reorderSchema.parse(await req.json());
    const pageId = await getExplorePageId();

    await reorderSections(body.revisionId, pageId, body.orderedIds, profile.id);
    return apiSuccess({ ok: true });
  } catch (err) {
    return handleStudioRouteError(err, "SECTION_REORDER_ERROR", "Failed to reorder sections");
  }
});
