import { getDraftExplorePage } from "@/lib/cms/assemble";
import { handleStudioRouteError } from "@/lib/api/studio-error";
import { requireAdmin } from "@/lib/cms/auth";
import {
  ensureExploreDraftRevision,
  getCmsEditorPayload,
  getCollectionLabelsByIds,
  getExplorePageId,
} from "@/lib/cms/queries";
import { heroCollectionIdSet } from "@/lib/cms/hero-collections";
import { heroConfigSchema } from "@/lib/cms/types";
import { apiSuccess } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

function collectEditorCollectionIds(
  editor: NonNullable<Awaited<ReturnType<typeof getCmsEditorPayload>>>
): string[] {
  const ids = new Set<string>();
  const hero = heroConfigSchema.safeParse(editor.revision.hero);
  if (hero.success) {
    for (const id of heroCollectionIdSet(hero.data)) ids.add(id);
  }
  for (const section of editor.sections) {
    for (const item of section.items) {
      if (item.collection_id) ids.add(item.collection_id);
    }
  }
  return [...ids];
}

export const GET = profileApiRoute("GET", "/api/studio/explore", async (req) => {
  try {
    const profile = await requireAdmin();
    const url = new URL(req.url);
    const preview = url.searchParams.get("preview") === "draft";

    await ensureExploreDraftRevision(await getExplorePageId(), profile.id);

    if (preview) {
      const draftPage = await getDraftExplorePage();
      return apiSuccess({ mode: "preview", page: draftPage });
    }

    const editor = await getCmsEditorPayload("explore", "draft");
    const published = await getCmsEditorPayload("explore", "published");
    const collectionLabels = editor
      ? await getCollectionLabelsByIds(collectEditorCollectionIds(editor))
      : {};

    return apiSuccess({
      mode: "editor",
      editor,
      publishedRevision: published?.revision ?? null,
      collectionLabels,
    });
  } catch (err) {
    return handleStudioRouteError(
      err,
      "STUDIO_EXPLORE_ERROR",
      "Failed to load studio explore data"
    );
  }
});
