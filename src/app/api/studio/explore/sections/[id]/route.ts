import { z } from "zod";
import { handleStudioRouteError } from "@/lib/api/studio-error";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/lib/cms/auth";
import { getExplorePageId } from "@/lib/cms/queries";
import { deleteSection, duplicateSection, updateSection } from "@/lib/cms/sections";
import { profileApiRoute } from "@/lib/debug/profiler";

const patchSchema = z.object({
  revisionId: z.string().uuid(),
  section: z.unknown(),
});

const duplicateSchema = z.object({
  revisionId: z.string().uuid(),
});

const revisionIdQuerySchema = z.string().uuid();

export const PATCH = profileApiRoute(
  "PATCH",
  "/api/studio/explore/sections/[id]",
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const profile = await requireAdmin();
      const { id } = await params;
      const body = patchSchema.parse(await req.json());
      const pageId = await getExplorePageId();

      const section = await updateSection(id, pageId, body.revisionId, body.section, profile.id);
      return apiSuccess(section);
    } catch (err) {
      return handleStudioRouteError(err, "SECTION_UPDATE_ERROR", "Failed to update section");
    }
  }
);

export const DELETE = profileApiRoute(
  "DELETE",
  "/api/studio/explore/sections/[id]",
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const profile = await requireAdmin();
      const { id } = await params;
      const url = new URL(req.url);
      const revisionIdRaw = url.searchParams.get("revisionId");
      const revisionId = revisionIdQuerySchema.parse(revisionIdRaw);

      const pageId = await getExplorePageId();
      await deleteSection(id, pageId, revisionId, profile.id);
      return apiSuccess({ ok: true });
    } catch (err) {
      return handleStudioRouteError(err, "SECTION_DELETE_ERROR", "Failed to delete section");
    }
  }
);

export const POST = profileApiRoute(
  "POST",
  "/api/studio/explore/sections/[id]",
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const profile = await requireAdmin();
      const { id } = await params;
      const body = duplicateSchema.parse(await req.json());
      const pageId = await getExplorePageId();

      const section = await duplicateSection(id, body.revisionId, pageId, profile.id);
      return apiSuccess(section);
    } catch (err) {
      return handleStudioRouteError(err, "SECTION_DUPLICATE_ERROR", "Failed to duplicate section");
    }
  }
);
