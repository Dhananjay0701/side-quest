import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertExploreDraftRevision } from "@/lib/cms/guards";
import { logCmsAction } from "@/lib/cms/queries";
import { SECTION_LAYOUTS, sectionMetadataSchema } from "@/lib/cms/types";

const sectionInputSchema = z.object({
  slug: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional(),
  layout: z.enum(SECTION_LAYOUTS),
  visible: z.boolean().default(true),
  metadata: sectionMetadataSchema.default({}),
});

const sectionPatchSchema = sectionInputSchema.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
});

const itemInputBaseSchema = z.object({
  itemType: z.enum(["collection", "city", "interest", "custom"]),
  collectionId: z.string().uuid().optional(),
  label: z.string().max(200).optional(),
  imageKey: z.string().max(500).optional(),
  href: z.string().max(500).optional(),
  icon: z.string().max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  sortOrder: z.number().int().min(0).optional(),
});

const itemInputSchema = itemInputBaseSchema.superRefine((value, ctx) => {
  if (value.itemType === "collection" && !value.collectionId) {
    ctx.addIssue({
      code: "custom",
      message: "collectionId is required for collection items",
      path: ["collectionId"],
    });
  }
  if ((value.itemType === "city" || value.itemType === "interest") && !value.label) {
    ctx.addIssue({
      code: "custom",
      message: "label is required for city and interest items",
      path: ["label"],
    });
  }
});

/** PATCH updates — no refinements (Zod forbids .partial() on refined schemas). */
const itemPatchSchema = itemInputBaseSchema.partial();

export async function createSection(
  revisionId: string,
  pageId: string,
  input: unknown,
  actorId: string
) {
  await assertExploreDraftRevision(revisionId);
  const parsed = sectionInputSchema.parse(input);
  const supabase = createAdminClient();

  const { data: maxRow } = await supabase
    .from("cms_sections")
    .select("sort_order")
    .eq("revision_id", revisionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("cms_sections")
    .insert({
      revision_id: revisionId,
      slug: parsed.slug,
      title: parsed.title,
      subtitle: parsed.subtitle ?? null,
      layout: parsed.layout,
      sort_order: sortOrder,
      visible: parsed.visible,
      metadata: parsed.metadata,
    })
    .select("id, revision_id, slug, title, subtitle, layout, sort_order, visible, metadata")
    .single();

  if (error) throw error;

  await logCmsAction({
    pageId,
    revisionId,
    action: "section.create",
    actorId,
    payload: { sectionId: data.id, slug: parsed.slug },
  });

  return data;
}

export async function updateSection(
  sectionId: string,
  pageId: string,
  revisionId: string,
  input: unknown,
  actorId: string
) {
  await assertExploreDraftRevision(revisionId);
  const parsed = sectionPatchSchema.parse(input);
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.slug !== undefined) patch.slug = parsed.slug;
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.subtitle !== undefined) patch.subtitle = parsed.subtitle;
  if (parsed.layout !== undefined) patch.layout = parsed.layout;
  if (parsed.visible !== undefined) patch.visible = parsed.visible;
  if (parsed.metadata !== undefined) patch.metadata = parsed.metadata;
  if (parsed.sortOrder !== undefined) patch.sort_order = parsed.sortOrder;

  const { data, error } = await supabase
    .from("cms_sections")
    .update(patch)
    .eq("id", sectionId)
    .eq("revision_id", revisionId)
    .select("id, revision_id, slug, title, subtitle, layout, sort_order, visible, metadata")
    .single();

  if (error) throw error;

  await logCmsAction({
    pageId,
    revisionId,
    action: "section.update",
    actorId,
    payload: { sectionId, patch: parsed },
  });

  return data;
}

export async function deleteSection(
  sectionId: string,
  pageId: string,
  revisionId: string,
  actorId: string
) {
  await assertExploreDraftRevision(revisionId);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("cms_sections")
    .delete()
    .eq("id", sectionId)
    .eq("revision_id", revisionId);

  if (error) throw error;

  await logCmsAction({
    pageId,
    revisionId,
    action: "section.delete",
    actorId,
    payload: { sectionId },
  });
}

export async function reorderSections(
  revisionId: string,
  pageId: string,
  orderedIds: string[],
  actorId: string
) {
  await assertExploreDraftRevision(revisionId);
  const supabase = createAdminClient();

  for (let index = 0; index < orderedIds.length; index++) {
    const { error } = await supabase
      .from("cms_sections")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", orderedIds[index])
      .eq("revision_id", revisionId);

    if (error) throw error;
  }

  await logCmsAction({
    pageId,
    revisionId,
    action: "section.reorder",
    actorId,
    payload: { orderedIds },
  });
}

export async function addSectionItem(
  sectionId: string,
  pageId: string,
  revisionId: string,
  input: unknown,
  actorId: string
) {
  await assertExploreDraftRevision(revisionId);
  const parsed = itemInputSchema.parse(input);
  const supabase = createAdminClient();

  const { data: maxRow } = await supabase
    .from("cms_section_items")
    .select("sort_order")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = parsed.sortOrder ?? (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("cms_section_items")
    .insert({
      section_id: sectionId,
      item_type: parsed.itemType,
      collection_id: parsed.collectionId ?? null,
      sort_order: sortOrder,
      label: parsed.label ?? null,
      image_key: parsed.imageKey ?? null,
      href: parsed.href ?? null,
      icon: parsed.icon ?? null,
      metadata: parsed.metadata,
    })
    .select(
      "id, section_id, item_type, collection_id, sort_order, label, image_key, href, icon, metadata"
    )
    .single();

  if (error) throw error;

  await logCmsAction({
    pageId,
    revisionId,
    action: "section_item.create",
    actorId,
    payload: { sectionId, itemId: data.id },
  });

  return data;
}

export async function updateSectionItem(
  itemId: string,
  sectionId: string,
  pageId: string,
  revisionId: string,
  input: unknown,
  actorId: string
) {
  await assertExploreDraftRevision(revisionId);
  const parsed = itemPatchSchema.parse(input);
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = {};
  if (parsed.itemType !== undefined) patch.item_type = parsed.itemType;
  if (parsed.collectionId !== undefined) patch.collection_id = parsed.collectionId;
  if (parsed.label !== undefined) patch.label = parsed.label;
  if (parsed.imageKey !== undefined) patch.image_key = parsed.imageKey;
  if (parsed.href !== undefined) patch.href = parsed.href;
  if (parsed.icon !== undefined) patch.icon = parsed.icon;
  if (parsed.metadata !== undefined) patch.metadata = parsed.metadata;
  if (parsed.sortOrder !== undefined) patch.sort_order = parsed.sortOrder;

  const { data, error } = await supabase
    .from("cms_section_items")
    .update(patch)
    .eq("id", itemId)
    .eq("section_id", sectionId)
    .select(
      "id, section_id, item_type, collection_id, sort_order, label, image_key, href, icon, metadata"
    )
    .single();

  if (error) throw error;

  await logCmsAction({
    pageId,
    revisionId,
    action: "section_item.update",
    actorId,
    payload: { sectionId, itemId, patch: parsed },
  });

  return data;
}

export async function deleteSectionItem(
  itemId: string,
  sectionId: string,
  pageId: string,
  revisionId: string,
  actorId: string
) {
  await assertExploreDraftRevision(revisionId);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("cms_section_items")
    .delete()
    .eq("id", itemId)
    .eq("section_id", sectionId);

  if (error) throw error;

  await logCmsAction({
    pageId,
    revisionId,
    action: "section_item.delete",
    actorId,
    payload: { sectionId, itemId },
  });
}

export async function reorderSectionItems(
  sectionId: string,
  pageId: string,
  revisionId: string,
  orderedIds: string[],
  actorId: string
) {
  await assertExploreDraftRevision(revisionId);
  const supabase = createAdminClient();

  for (let index = 0; index < orderedIds.length; index++) {
    const { error } = await supabase
      .from("cms_section_items")
      .update({ sort_order: index })
      .eq("id", orderedIds[index])
      .eq("section_id", sectionId);

    if (error) throw error;
  }

  await logCmsAction({
    pageId,
    revisionId,
    action: "section_item.reorder",
    actorId,
    payload: { sectionId, orderedIds },
  });
}

export async function duplicateSection(
  sectionId: string,
  revisionId: string,
  pageId: string,
  actorId: string
) {
  await assertExploreDraftRevision(revisionId);
  const supabase = createAdminClient();

  const { data: section, error: sectionError } = await supabase
    .from("cms_sections")
    .select("slug, title, subtitle, layout, sort_order, visible, metadata")
    .eq("id", sectionId)
    .eq("revision_id", revisionId)
    .single();

  if (sectionError) throw sectionError;

  const { data: items, error: itemsError } = await supabase
    .from("cms_section_items")
    .select(
      "item_type, collection_id, sort_order, label, image_key, href, icon, metadata"
    )
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: true });

  if (itemsError) throw itemsError;

  const newSection = await createSection(
    revisionId,
    pageId,
    {
      slug: `${section.slug}-copy-${Date.now()}`,
      title: `${section.title} (copy)`,
      subtitle: section.subtitle ?? undefined,
      layout: section.layout,
      visible: section.visible,
      metadata: section.metadata,
    },
    actorId
  );

  if (items?.length) {
    for (const item of items) {
      await addSectionItem(
        newSection.id,
        pageId,
        revisionId,
        {
          itemType: item.item_type,
          collectionId: item.collection_id ?? undefined,
          label: item.label ?? undefined,
          imageKey: item.image_key ?? undefined,
          href: item.href ?? undefined,
          icon: item.icon ?? undefined,
          metadata: (item.metadata as Record<string, unknown>) ?? {},
          sortOrder: item.sort_order,
        },
        actorId
      );
    }
  }

  return newSection;
}
