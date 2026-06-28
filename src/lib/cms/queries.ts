import { createAdminClient } from "@/lib/supabase/admin";
import { getCollectionsTopTagsMap } from "@/lib/db/queries/collections";
import { resolveAssetUrl } from "@/lib/images/assets";
import {
  EXPLORE_PAGE_SLUG,
  heroConfigSchema,
  pageSettingsSchema,
  sectionMetadataSchema,
  type CmsAuditLogRow,
  type CmsEditorPayload,
  type CmsPageRow,
  type CmsRevisionRow,
  type CmsSectionItemRow,
  type CmsSectionRow,
  type RevisionStatus,
} from "@/lib/cms/types";
import type { FeaturedCardVariant } from "@/lib/explore/types";

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  place_count: number;
  cover_image_url: string | null;
}

const DEFAULT_VARIANTS: FeaturedCardVariant[] = ["hero", "tall", "tall", "wide", "tall"];

export async function getCollectionLabelsByIds(
  ids: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name")
    .in("id", unique)
    .eq("is_deleted", false);

  if (error) throw error;

  const labels: Record<string, string> = {};
  for (const row of data ?? []) {
    labels[row.id as string] = row.name as string;
  }
  return labels;
}

export async function getCmsPageBySlug(slug: string): Promise<CmsPageRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("cms_pages").select("id, slug, name").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as CmsPageRow | null) ?? null;
}

export async function getCmsRevision(
  pageId: string,
  status: RevisionStatus
): Promise<CmsRevisionRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cms_page_revisions")
    .select(
      "id, page_id, version_number, status, hero, settings, created_at, updated_at, created_by, published_at, published_by"
    )
    .eq("page_id", pageId)
    .eq("status", status)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as Omit<CmsRevisionRow, "hero" | "settings">),
    hero: heroConfigSchema.parse(data.hero ?? {}),
    settings: pageSettingsSchema.parse(data.settings ?? {}),
  };
}

export async function getCmsSections(revisionId: string): Promise<CmsSectionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cms_sections")
    .select("id, revision_id, slug, title, subtitle, layout, sort_order, visible, metadata")
    .eq("revision_id", revisionId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...(row as Omit<CmsSectionRow, "metadata">),
    metadata: sectionMetadataSchema.parse(row.metadata ?? {}),
  }));
}

export async function getCmsSectionItems(sectionIds: string[]): Promise<CmsSectionItemRow[]> {
  if (sectionIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cms_section_items")
    .select(
      "id, section_id, item_type, collection_id, sort_order, label, image_key, href, icon, metadata"
    )
    .in("section_id", sectionIds)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CmsSectionItemRow[];
}

export async function loadCollectionsMap(collectionIds: string[]): Promise<Map<string, CollectionRow>> {
  const map = new Map<string, CollectionRow>();
  if (collectionIds.length === 0) return map;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, description, place_count, cover_image_url")
    .in("id", collectionIds)
    .eq("is_deleted", false);

  if (error) throw error;

  for (const row of data ?? []) {
    map.set(row.id as string, row as CollectionRow);
  }

  return map;
}

export async function getTopTagsForCollections(collectionIds: string[]): Promise<Map<string, string[]>> {
  return getCollectionsTopTagsMap(collectionIds, 4);
}

export function collectionHref(id: string): string {
  return `/collections/${id}`;
}

export function mapCollectionToExplore(
  collection: CollectionRow,
  override: Record<string, unknown> | undefined,
  topTags: string[]
) {
  const meta = (override ?? {}) as Record<string, string | undefined>;
  const imageKey = meta.imageKey ?? collection.cover_image_url;
  const category =
    meta.category ?? (topTags.length > 0 ? topTags.slice(0, 2).join(" · ") : "Collection");

  return {
    id: collection.id,
    name: meta.name ?? collection.name,
    description: meta.description ?? collection.description ?? "",
    category,
    placeCount: collection.place_count,
    imageUrl: resolveAssetUrl(imageKey) ?? "",
    href: collectionHref(collection.id),
    duration: meta.duration,
    tag: meta.tag,
    editorialCue: meta.editorialCue,
  };
}

export function mapFeaturedCollection(
  collection: CollectionRow,
  variant: FeaturedCardVariant,
  override: Record<string, unknown> | undefined,
  topTags: string[]
) {
  return {
    ...mapCollectionToExplore(collection, override, topTags),
    variant,
  };
}

export function resolveVariant(
  collectionId: string,
  index: number,
  variants: Record<string, FeaturedCardVariant>
): FeaturedCardVariant {
  return variants[collectionId] ?? DEFAULT_VARIANTS[index % DEFAULT_VARIANTS.length] ?? "tall";
}

export async function getCmsAuditLogs(pageId: string, limit = 30): Promise<CmsAuditLogRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cms_audit_logs")
    .select("id, page_id, revision_id, action, actor_id, payload, created_at")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CmsAuditLogRow[];
}

export async function getCmsEditorPayload(
  slug: string,
  status: RevisionStatus = "draft"
): Promise<CmsEditorPayload | null> {
  const page = await getCmsPageBySlug(slug);
  if (!page) return null;

  const revision = await getCmsRevision(page.id, status);
  if (!revision) return null;

  const sections = await getCmsSections(revision.id);
  const items = await getCmsSectionItems(sections.map((s) => s.id));
  const itemsBySection = new Map<string, CmsSectionItemRow[]>();

  for (const item of items) {
    const list = itemsBySection.get(item.section_id) ?? [];
    list.push(item);
    itemsBySection.set(item.section_id, list);
  }

  const history = await getCmsAuditLogs(page.id);

  return {
    page,
    revision,
    sections: sections.map((section) => ({
      ...section,
      items: itemsBySection.get(section.id) ?? [],
    })),
    history,
  };
}

export async function ensureExploreDraftRevision(
  pageId: string,
  actorId: string | null
): Promise<CmsRevisionRow> {
  const existing = await getCmsRevision(pageId, "draft");
  if (existing) return existing;

  const published = await getCmsRevision(pageId, "published");
  const supabase = createAdminClient();

  const nextVersion = published ? published.version_number + 1 : 1;

  const { data: revision, error: revisionError } = await supabase
    .from("cms_page_revisions")
    .insert({
      page_id: pageId,
      version_number: nextVersion,
      status: "draft",
      hero: published?.hero ?? {},
      settings: published?.settings ?? {},
      created_by: actorId,
    })
    .select(
      "id, page_id, version_number, status, hero, settings, created_at, updated_at, created_by, published_at, published_by"
    )
    .single();

  if (revisionError) throw revisionError;

  if (published) {
    const sections = await getCmsSections(published.id);
    const items = await getCmsSectionItems(sections.map((s) => s.id));

    for (const section of sections) {
      const { data: newSection, error: sectionError } = await supabase
        .from("cms_sections")
        .insert({
          revision_id: revision.id,
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

      const sectionItems = items.filter((item) => item.section_id === section.id);
      if (sectionItems.length > 0) {
        const { error: itemsError } = await supabase.from("cms_section_items").insert(
          sectionItems.map((item) => ({
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
        if (itemsError) throw itemsError;
      }
    }
  }

  return {
    ...(revision as Omit<CmsRevisionRow, "hero" | "settings">),
    hero: heroConfigSchema.parse(revision.hero ?? {}),
    settings: pageSettingsSchema.parse(revision.settings ?? {}),
  };
}

export async function logCmsAction(input: {
  pageId: string;
  revisionId?: string;
  action: string;
  actorId: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("cms_audit_logs").insert({
    page_id: input.pageId,
    revision_id: input.revisionId ?? null,
    action: input.action,
    actor_id: input.actorId,
    payload: input.payload ?? {},
  });
  if (error) throw error;
}

export async function getExplorePageId(): Promise<string> {
  const page = await getCmsPageBySlug(EXPLORE_PAGE_SLUG);
  if (!page) throw new Error("Explore page is not configured");
  return page.id;
}
