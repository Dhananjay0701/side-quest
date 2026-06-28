import { z } from "zod";
import { handleStudioRouteError } from "@/lib/api/studio-error";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/lib/cms/auth";
import { getExplorePageId } from "@/lib/cms/queries";
import {
  addSectionItem,
  deleteSectionItem,
  reorderSectionItems,
  updateSectionItem,
} from "@/lib/cms/sections";
import { profileApiRoute } from "@/lib/debug/profiler";

const createSchema = z.object({
  revisionId: z.string().uuid(),
  item: z.unknown(),
});

const reorderSchema = z.object({
  revisionId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

const patchSchema = z.object({
  revisionId: z.string().uuid(),
  item: z.unknown(),
});

const uuidQuerySchema = z.string().uuid();

export const POST = profileApiRoute(
  "POST",
  "/api/studio/explore/sections/[id]/items",
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const profile = await requireAdmin();
      const { id: sectionId } = await params;
      const body = createSchema.parse(await req.json());
      const pageId = await getExplorePageId();

      const item = await addSectionItem(
        sectionId,
        pageId,
        body.revisionId,
        body.item,
        profile.id
      );

      return apiSuccess(item);
    } catch (err) {
      return handleStudioRouteError(err, "ITEM_CREATE_ERROR", "Failed to add section item");
    }
  }
);

export const PATCH = profileApiRoute(
  "PATCH",
  "/api/studio/explore/sections/[id]/items",
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const profile = await requireAdmin();
      const { id: sectionId } = await params;
      const url = new URL(req.url);
      const itemId = uuidQuerySchema.parse(url.searchParams.get("itemId"));

      const body = patchSchema.parse(await req.json());
      const pageId = await getExplorePageId();

      const item = await updateSectionItem(
        itemId,
        sectionId,
        pageId,
        body.revisionId,
        body.item,
        profile.id
      );

      return apiSuccess(item);
    } catch (err) {
      return handleStudioRouteError(err, "ITEM_UPDATE_ERROR", "Failed to update section item");
    }
  }
);

export const DELETE = profileApiRoute(
  "DELETE",
  "/api/studio/explore/sections/[id]/items",
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const profile = await requireAdmin();
      const { id: sectionId } = await params;
      const url = new URL(req.url);
      const itemId = uuidQuerySchema.parse(url.searchParams.get("itemId"));
      const revisionId = uuidQuerySchema.parse(url.searchParams.get("revisionId"));

      const pageId = await getExplorePageId();
      await deleteSectionItem(itemId, sectionId, pageId, revisionId, profile.id);
      return apiSuccess({ ok: true });
    } catch (err) {
      return handleStudioRouteError(err, "ITEM_DELETE_ERROR", "Failed to delete section item");
    }
  }
);

export const PUT = profileApiRoute(
  "PUT",
  "/api/studio/explore/sections/[id]/items",
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const profile = await requireAdmin();
      const { id: sectionId } = await params;
      const body = reorderSchema.parse(await req.json());
      const pageId = await getExplorePageId();

      await reorderSectionItems(sectionId, pageId, body.revisionId, body.orderedIds, profile.id);
      return apiSuccess({ ok: true });
    } catch (err) {
      return handleStudioRouteError(err, "ITEM_REORDER_ERROR", "Failed to reorder section items");
    }
  }
);
