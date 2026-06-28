import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateExplorePage } from "@/lib/cms/cache";
import { assertExploreDraftRevision } from "@/lib/cms/guards";
import {
  ensureExploreDraftRevision,
  getCmsPageBySlug,
  getCmsRevision,
  getCmsSections,
  logCmsAction,
} from "@/lib/cms/queries";
import { heroConfigSchema, pageSettingsSchema } from "@/lib/cms/types";

export async function publishExploreDraft(actorId: string): Promise<{ versionNumber: number }> {
  const page = await getCmsPageBySlug("explore");
  if (!page) throw new Error("Explore page is not configured");

  const draft = await ensureExploreDraftRevision(page.id, actorId);
  await assertExploreDraftRevision(draft.id);

  const supabase = createAdminClient();
  const published = await getCmsRevision(page.id, "published");
  const previousPublishedId = published?.id ?? null;
  const now = new Date().toISOString();

  if (published) {
    const { error: archiveError } = await supabase
      .from("cms_page_revisions")
      .update({ status: "archived", updated_at: now })
      .eq("id", published.id)
      .eq("status", "published");
    if (archiveError) throw archiveError;
  }

  const { error: publishError } = await supabase
    .from("cms_page_revisions")
    .update({
      status: "published",
      published_at: now,
      published_by: actorId,
      updated_at: now,
    })
    .eq("id", draft.id)
    .eq("status", "draft");

  if (publishError) {
    if (previousPublishedId) {
      await supabase
        .from("cms_page_revisions")
        .update({ status: "published", updated_at: now })
        .eq("id", previousPublishedId);
    }
    throw publishError;
  }

  const nextVersion = draft.version_number + 1;
  const { data: newDraft, error: newDraftError } = await supabase
    .from("cms_page_revisions")
    .insert({
      page_id: page.id,
      version_number: nextVersion,
      status: "draft",
      hero: draft.hero,
      settings: draft.settings,
      created_by: actorId,
    })
    .select("id")
    .single();

  if (newDraftError) {
    throw newDraftError;
  }

  const sections = await getCmsSections(draft.id);
  for (const section of sections) {
    const { data: newSection, error: sectionError } = await supabase
      .from("cms_sections")
      .insert({
        revision_id: newDraft.id,
        slug: section.slug,
        title: section.title,
        subtitle: section.subtitle,
        layout: section.layout,
        sort_order: section.sort_order,
        visible: section.visible,
        metadata: section.metadata,
      })
      .select("id")
      .single();

    if (sectionError) throw sectionError;

    const { data: items, error: itemsReadError } = await supabase
      .from("cms_section_items")
      .select(
        "item_type, collection_id, sort_order, label, image_key, href, icon, metadata"
      )
      .eq("section_id", section.id)
      .order("sort_order", { ascending: true });

    if (itemsReadError) throw itemsReadError;

    if (items?.length) {
      const { error: itemsInsertError } = await supabase.from("cms_section_items").insert(
        items.map((item) => ({
          section_id: newSection.id,
          item_type: item.item_type,
          collection_id: item.collection_id,
          sort_order: item.sort_order,
          label: item.label,
          image_key: item.image_key,
          href: item.href,
          icon: item.icon,
          metadata: item.metadata,
        }))
      );
      if (itemsInsertError) throw itemsInsertError;
    }
  }

  await logCmsAction({
    pageId: page.id,
    revisionId: draft.id,
    action: "publish",
    actorId,
    payload: { versionNumber: draft.version_number },
  });

  await revalidateExplorePage();

  return { versionNumber: draft.version_number };
}

export async function updateExploreHero(
  revisionId: string,
  hero: unknown,
  actorId: string
): Promise<void> {
  await assertExploreDraftRevision(revisionId);
  const parsed = heroConfigSchema.parse(hero);
  const supabase = createAdminClient();

  const { data: revision, error } = await supabase
    .from("cms_page_revisions")
    .update({ hero: parsed, updated_at: new Date().toISOString() })
    .eq("id", revisionId)
    .eq("status", "draft")
    .select("page_id")
    .single();

  if (error) throw error;

  await logCmsAction({
    pageId: revision.page_id,
    revisionId,
    action: "hero.update",
    actorId,
    payload: { hero: parsed },
  });
}

export async function updateExploreSettings(
  revisionId: string,
  settings: unknown,
  actorId: string
): Promise<void> {
  await assertExploreDraftRevision(revisionId);
  const parsed = pageSettingsSchema.parse(settings);
  const supabase = createAdminClient();

  const { data: revision, error } = await supabase
    .from("cms_page_revisions")
    .update({ settings: parsed, updated_at: new Date().toISOString() })
    .eq("id", revisionId)
    .eq("status", "draft")
    .select("page_id")
    .single();

  if (error) throw error;

  await logCmsAction({
    pageId: revision.page_id,
    revisionId,
    action: "settings.update",
    actorId,
    payload: { settings: parsed },
  });
}
