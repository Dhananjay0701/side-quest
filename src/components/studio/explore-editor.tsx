"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, Eye, Plus, Trash2 } from "lucide-react";
import type { CmsEditorPayload, CmsSectionItemRow, CmsSectionRow, SectionMetadata } from "@/lib/cms/types";
import { sectionMetadataSchema } from "@/lib/cms/types";
import type { ProfileRole } from "@/lib/auth/roles-edge";
import { isAdminRole } from "@/lib/auth/roles-edge";
import {
  DESKTOP_GRID_CARD_TEXT,
  DESKTOP_SCROLL_CARD_TEXT,
  MOBILE_GRID_CARD_TEXT,
  MOBILE_SCROLL_CARD_TEXT,
  cardTextDisplaySchema,
  type CardTextDisplay,
} from "@/lib/cms/card-text-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardTextDisplayEditor } from "@/components/studio/card-text-display-editor";
import { PublishPanel } from "@/components/studio/publish-panel";
import { CollectionPicker } from "@/components/studio/collection-picker";
import { CityItemEditor } from "@/components/studio/city-item-editor";
import { SortableList } from "@/components/studio/sortable-list";
import { parseApiJson } from "@/lib/api/response";

interface ExploreEditorProps {
  role: ProfileRole;
}

function collectionLabel(
  collectionId: string | null,
  labels: Record<string, string>
): string {
  if (!collectionId) return "Unknown collection";
  return labels[collectionId] ?? "Unknown collection";
}

function sectionCardTextDefaults(layout: CmsSectionRow["layout"]) {
  if (layout === "collection_grid") {
    return { desktop: DESKTOP_GRID_CARD_TEXT, mobile: MOBILE_GRID_CARD_TEXT };
  }
  return { desktop: DESKTOP_SCROLL_CARD_TEXT, mobile: MOBILE_SCROLL_CARD_TEXT };
}

function readSectionCardText(section: CmsSectionRow, platform: "desktop" | "mobile"): CardTextDisplay {
  const metadata = sectionMetadataSchema.parse(section.metadata ?? {});
  const defaults = sectionCardTextDefaults(section.layout);
  const raw = platform === "desktop" ? metadata.cardText?.desktop : metadata.cardText?.mobile;
  return cardTextDisplaySchema.parse(raw ?? defaults[platform]);
}

function isCollectionSection(layout: CmsSectionRow["layout"]) {
  return layout === "collection_scroll" || layout === "collection_grid";
}

export function ExploreEditor({ role }: ExploreEditorProps) {
  const [data, setData] = useState<CmsEditorPayload | null>(null);
  const [collectionLabels, setCollectionLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);

  const canEdit = isAdminRole(role);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch("/api/studio/explore", { credentials: "same-origin" });
      const json = await parseApiJson<{
        editor: CmsEditorPayload;
        collectionLabels?: Record<string, string>;
      }>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to load editor");
      setData(json.data?.editor ?? null);
      setCollectionLabels(json.data?.collectionLabels ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load editor");
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  function patchLocalItem(sectionId: string, updated: CmsSectionItemRow) {
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section) =>
          section.id !== sectionId
            ? section
            : {
                ...section,
                items: section.items.map((item) => (item.id === updated.id ? updated : item)),
              }
        ),
      };
    });
  }

  function reorderLocalItems(sectionId: string, orderedIds: string[]) {
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section) => {
          if (section.id !== sectionId) return section;
          const byId = new Map(section.items.map((item) => [item.id, item]));
          const items = orderedIds
            .map((id) => byId.get(id))
            .filter((item): item is CmsSectionItemRow => item !== undefined);
          return { ...section, items };
        }),
      };
    });
  }

  function appendLocalItem(sectionId: string, item: CmsSectionItemRow) {
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section) =>
          section.id !== sectionId ? section : { ...section, items: [...section.items, item] }
        ),
      };
    });
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function mutateJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, { credentials: "same-origin", ...init });
    const json = await parseApiJson<T>(res);
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Request failed (${res.status})`);
    }
    return json.data as T;
  }

  async function mutate(path: string, init?: RequestInit) {
    await mutateJson<unknown>(path, init);
  }

  async function runMutation(task: () => Promise<void>, options?: { refresh?: boolean }) {
    try {
      await task();
      if (options?.refresh) {
        await load({ silent: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function reorderSections(orderedIds: string[]) {
    if (!data || !canEdit) return;
    const previousOrder = data.sections.map((s) => s.id);
    setData((current) => {
      if (!current) return current;
      const byId = new Map(current.sections.map((s) => [s.id, s]));
      const sections = orderedIds
        .map((id) => byId.get(id))
        .filter((s): s is (typeof current.sections)[number] => s !== undefined);
      return { ...current, sections };
    });
    try {
      await mutate("/api/studio/explore/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId: data.revision.id, orderedIds }),
      });
    } catch (err) {
      setData((current) => {
        if (!current) return current;
        const byId = new Map(current.sections.map((s) => [s.id, s]));
        const sections = previousOrder
          .map((id) => byId.get(id))
          .filter((s): s is (typeof current.sections)[number] => s !== undefined);
        return { ...current, sections };
      });
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function moveSection(section: CmsSectionRow, direction: "up" | "down") {
    if (!data) return;
    const ids = data.sections.map((s) => s.id);
    const index = ids.indexOf(section.id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await reorderSections(ids);
  }

  async function toggleVisibility(section: CmsSectionRow) {
    if (!data || !canEdit) return;
    await runMutation(
      () =>
        mutate(`/api/studio/explore/sections/${section.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revisionId: data.revision.id,
            section: { visible: !section.visible },
          }),
        }),
      { refresh: true }
    );
  }

  async function deleteSection(sectionId: string) {
    if (!data || !canEdit) return;
    if (!confirm("Delete this section?")) return;
    await runMutation(
      () =>
        mutate(`/api/studio/explore/sections/${sectionId}?revisionId=${data.revision.id}`, {
          method: "DELETE",
        }),
      { refresh: true }
    );
  }

  async function duplicateSection(sectionId: string) {
    if (!data || !canEdit) return;
    await runMutation(
      () =>
        mutate(`/api/studio/explore/sections/${sectionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revisionId: data.revision.id }),
        }),
      { refresh: true }
    );
  }

  async function createSection() {
    if (!data || !canEdit) return;
    const slug = `section-${Date.now()}`;
    await runMutation(
      () =>
        mutate("/api/studio/explore/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revisionId: data.revision.id,
            section: {
              slug,
              title: "New section",
              layout: "collection_scroll",
              visible: true,
            },
          }),
        }),
      { refresh: true }
    );
  }

  async function updateSectionField(
    section: CmsSectionRow,
    patch: Partial<Pick<CmsSectionRow, "title" | "subtitle" | "layout">>
  ) {
    if (!data || !canEdit) return;
    await runMutation(
      () =>
        mutate(`/api/studio/explore/sections/${section.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revisionId: data.revision.id, section: patch }),
        }),
      { refresh: true }
    );
  }

  async function updateSectionCardText(
    section: CmsSectionRow,
    platform: "desktop" | "mobile",
    value: CardTextDisplay
  ) {
    if (!data || !canEdit) return;
    const metadata = sectionMetadataSchema.parse(section.metadata ?? {});
    const defaults = sectionCardTextDefaults(section.layout);
    const nextMetadata: SectionMetadata = {
      ...metadata,
      cardText: {
        desktop: metadata.cardText?.desktop ?? defaults.desktop,
        mobile: metadata.cardText?.mobile ?? defaults.mobile,
        [platform]: value,
      },
    };
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((entry) =>
          entry.id === section.id ? { ...entry, metadata: nextMetadata } : entry
        ),
      };
    });
    try {
      await mutate(`/api/studio/explore/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revisionId: data.revision.id,
          section: { metadata: nextMetadata },
        }),
      });
    } catch (err) {
      await load({ silent: true });
      setError(err instanceof Error ? err.message : "Failed to save card text settings");
    }
  }

  async function addCityToSection(sectionId: string) {
    if (!data || !canEdit) return;
    const label = window.prompt("City name");
    if (!label?.trim()) return;
    try {
      const item = await mutateJson<CmsSectionItemRow>(
        `/api/studio/explore/sections/${sectionId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revisionId: data.revision.id,
            item: { itemType: "city", label: label.trim(), href: "#" },
          }),
        }
      );
      appendLocalItem(sectionId, item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add city");
    }
  }

  async function addCollectionToSection(collectionId: string, name?: string) {
    if (!data || !pickerSectionId || !canEdit) return;
    try {
      const item = await mutateJson<CmsSectionItemRow>(
        `/api/studio/explore/sections/${pickerSectionId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revisionId: data.revision.id,
            item: { itemType: "collection", collectionId },
          }),
        }
      );
      if (name) {
        setCollectionLabels((prev) => ({ ...prev, [collectionId]: name }));
      }
      appendLocalItem(pickerSectionId, item);
      setPickerSectionId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add collection");
    }
  }

  async function reorderSectionItems(sectionId: string, orderedIds: string[]) {
    if (!data || !canEdit) return;
    const previousIds =
      data.sections.find((section) => section.id === sectionId)?.items.map((item) => item.id) ?? [];
    reorderLocalItems(sectionId, orderedIds);
    try {
      await mutate(`/api/studio/explore/sections/${sectionId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId: data.revision.id, orderedIds }),
      });
    } catch (err) {
      reorderLocalItems(sectionId, previousIds);
      setError(err instanceof Error ? err.message : "Failed to reorder items");
    }
  }

  async function removeSectionItem(sectionId: string, itemId: string) {
    if (!data || !canEdit) return;
    if (!confirm("Remove this collection from the section?")) return;
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section) =>
          section.id !== sectionId
            ? section
            : { ...section, items: section.items.filter((item) => item.id !== itemId) }
        ),
      };
    });
    try {
      await mutate(
        `/api/studio/explore/sections/${sectionId}/items?itemId=${itemId}&revisionId=${data.revision.id}`,
        { method: "DELETE" }
      );
    } catch (err) {
      await load({ silent: true });
      setError(err instanceof Error ? err.message : "Failed to remove item");
    }
  }

  function itemDisplayName(item: CmsSectionItemRow): string {
    if (item.item_type === "collection") {
      return collectionLabel(item.collection_id, collectionLabels);
    }
    return item.label ?? item.item_type;
  }

  if (loading) {
    return <p className="text-sm text-muted/50">Loading explore editor…</p>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-6 text-sm">
        {error ?? "Explore editor is not configured yet. Run the seed script."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Explore editor</h2>
          <p className="mt-1 text-sm text-muted/55">
            Draft v{data.revision.version_number} · {data.sections.length} sections
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/explore" target="_blank">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Live
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/studio/explore/preview" target="_blank">
              Preview draft
            </Link>
          </Button>
          {canEdit ? <PublishPanel onPublished={load} /> : null}
        </div>
      </div>

      <div className="space-y-4">
        {data.sections.map((section) => (
          <div
            key={section.id}
            className="rounded-xl border border-border/15 bg-card/30 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Input
                    defaultValue={section.title}
                    disabled={!canEdit}
                    onBlur={(e) => {
                      if (e.target.value !== section.title) {
                        void updateSectionField(section, { title: e.target.value });
                      }
                    }}
                    className="max-w-sm bg-background/40"
                  />
                  <select
                    defaultValue={section.layout}
                    disabled={!canEdit}
                    onChange={(e) =>
                      void updateSectionField(section, {
                        layout: e.target.value as CmsSectionRow["layout"],
                      })
                    }
                    className="rounded-lg border border-border/20 bg-background/40 px-3 py-2 text-sm"
                  >
                    <option value="collection_scroll">Collection scroll</option>
                    <option value="collection_grid">Collection grid</option>
                    <option value="city_grid">City grid</option>
                    <option value="interest_grid">Interest grid</option>
                    <option value="trust">Trust</option>
                    <option value="cta">CTA</option>
                  </select>
                </div>
                <Input
                  defaultValue={section.subtitle ?? ""}
                  placeholder="Subtitle (optional)"
                  disabled={!canEdit}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value !== (section.subtitle ?? "")) {
                      void updateSectionField(section, { subtitle: value || undefined });
                    }
                  }}
                  className="bg-background/40"
                />
                <p className="text-xs text-muted/40">
                  {section.slug} · {section.items.length} items ·{" "}
                  {section.visible ? "Visible" : "Hidden"}
                </p>
                {isCollectionSection(section.layout) ? (
                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <CardTextDisplayEditor
                      label="Desktop cards"
                      value={readSectionCardText(section, "desktop")}
                      disabled={!canEdit}
                      onChange={(value) => void updateSectionCardText(section, "desktop", value)}
                    />
                    <CardTextDisplayEditor
                      label="Mobile cards"
                      value={readSectionCardText(section, "mobile")}
                      disabled={!canEdit}
                      onChange={(value) => void updateSectionCardText(section, "mobile", value)}
                    />
                  </div>
                ) : null}
              </div>

              {canEdit ? (
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" size="sm" onClick={() => void moveSection(section, "up")}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void moveSection(section, "down")}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void toggleVisibility(section)}>
                    {section.visible ? "Hide" : "Show"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void duplicateSection(section.id)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      section.layout === "city_grid"
                        ? void addCityToSection(section.id)
                        : setPickerSectionId(section.id)
                    }
                  >
                    {section.layout === "city_grid" ? "Add city" : "Add collection"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void deleteSection(section.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>

            {section.items.length > 0 ? (
              <div className="mt-4 border-t border-border/10 pt-4">
                {section.layout === "city_grid" ? (
                  <>
                    <p className="mb-3 text-xs text-muted/40">
                      Drag to reorder cities — upload images to R2 (city_assets/)
                    </p>
                    <SortableList
                      items={section.items}
                      disabled={!canEdit}
                      onReorder={(orderedIds) => void reorderSectionItems(section.id, orderedIds)}
                      renderItem={(item) => (
                        <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/10 bg-background/20 p-3">
                          <CityItemEditor
                            item={item}
                            sectionId={section.id}
                            revisionId={data.revision.id}
                            disabled={!canEdit}
                            onItemPatched={(updated) => patchLocalItem(section.id, updated)}
                          />
                          {canEdit ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 px-2 text-muted/45 hover:text-secondary"
                              onClick={() => void removeSectionItem(section.id, item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-muted/40">Drag to reorder collections</p>
                    <SortableList
                      items={section.items}
                      disabled={!canEdit}
                      onReorder={(orderedIds) => void reorderSectionItems(section.id, orderedIds)}
                      renderItem={(item, index) => (
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-foreground/85">
                            #{index + 1} {itemDisplayName(item)}
                          </span>
                          {canEdit ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 px-2 text-muted/45 hover:text-secondary"
                              onClick={() => void removeSectionItem(section.id, item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      )}
                    />
                  </>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {canEdit ? (
        <Button onClick={() => void createSection()} variant="outline">
          <Plus className="mr-1.5 h-4 w-4" />
          Add section
        </Button>
      ) : null}

      {pickerSectionId ? (
        <CollectionPicker
          onSelect={(id, name) => void addCollectionToSection(id, name)}
          onClose={() => setPickerSectionId(null)}
        />
      ) : null}
    </div>
  );
}
