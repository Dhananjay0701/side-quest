"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { HeroConfig } from "@/lib/cms/types";
import type { ProfileRole } from "@/lib/auth/roles-edge";
import { isAdminRole } from "@/lib/auth/roles-edge";
import { normalizeHeroCollections } from "@/lib/cms/hero-collections";
import {
  DESKTOP_HERO_CARD_TEXT,
  MOBILE_HERO_CARD_TEXT,
  cardTextDisplaySchema,
} from "@/lib/cms/card-text-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardTextDisplayEditor } from "@/components/studio/card-text-display-editor";
import { CollectionPicker } from "@/components/studio/collection-picker";
import { SortableList } from "@/components/studio/sortable-list";
import { parseApiJson } from "@/lib/api/response";

interface HeroEditorProps {
  role: ProfileRole;
}

type PickerTarget = "cinematic" | "featured" | "mobile" | null;

function migrateHeroConfig(hero: HeroConfig): HeroConfig {
  const normalized = normalizeHeroCollections(hero);
  return {
    ...hero,
    cinematicCollectionId: hero.cinematicCollectionId ?? normalized.cinematicId,
    featuredCollectionIds:
      hero.featuredCollectionIds.length > 0 ? hero.featuredCollectionIds : normalized.featuredIds,
    mobileFeaturedCollectionIds:
      hero.mobileFeaturedCollectionIds.length > 0
        ? hero.mobileFeaturedCollectionIds
        : normalized.mobileIds,
    desktopCardText: cardTextDisplaySchema.parse(hero.desktopCardText ?? DESKTOP_HERO_CARD_TEXT),
    mobileCardText: cardTextDisplaySchema.parse(hero.mobileCardText ?? MOBILE_HERO_CARD_TEXT),
  };
}

export function HeroEditor({ role }: HeroEditorProps) {
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [hero, setHero] = useState<HeroConfig | null>(null);
  const [collectionLabels, setCollectionLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canEdit = isAdminRole(role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio/explore", { credentials: "same-origin" });
      const json = await parseApiJson<{
        editor: { revision: { id: string; hero: HeroConfig } };
        collectionLabels?: Record<string, string>;
      }>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to load hero");
      setRevisionId(json.data?.editor.revision.id ?? null);
      const rawHero = json.data?.editor.revision.hero ?? null;
      setHero(rawHero ? migrateHeroConfig(rawHero) : null);
      setCollectionLabels(json.data?.collectionLabels ?? {});
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load hero");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!revisionId || !hero || !canEdit) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/studio/explore/hero", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, hero }),
      });
      const json = await parseApiJson(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to save hero");
      setMessage("Hero saved to draft");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save hero");
    } finally {
      setSaving(false);
    }
  }

  function updateHero(patch: Partial<HeroConfig>) {
    setHero((current) => (current ? { ...current, ...patch } : current));
  }

  function addCollection(id: string, name: string, target: Exclude<PickerTarget, null>) {
    if (!hero) return;
    setCollectionLabels((prev) => ({ ...prev, [id]: name }));

    if (target === "cinematic") {
      updateHero({ cinematicCollectionId: id });
      return;
    }

    if (target === "featured") {
      if (hero.featuredCollectionIds.includes(id) || hero.featuredCollectionIds.length >= 3) return;
      updateHero({ featuredCollectionIds: [...hero.featuredCollectionIds, id] });
      return;
    }

    if (hero.mobileFeaturedCollectionIds.includes(id) || hero.mobileFeaturedCollectionIds.length >= 3) {
      return;
    }
    updateHero({ mobileFeaturedCollectionIds: [...hero.mobileFeaturedCollectionIds, id] });
  }

  const featuredItems = (hero?.featuredCollectionIds ?? []).map((id) => ({ id }));
  const mobileItems = (hero?.mobileFeaturedCollectionIds ?? []).map((id) => ({ id }));

  if (loading) return <p className="text-sm text-muted/50">Loading hero editor…</p>;
  if (!hero) {
    return <p className="text-sm text-muted/50">{message ?? "Hero is not configured yet."}</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Hero editor</h2>
          <p className="mt-1 text-sm text-muted/55">
            Headline, copy, and separate desktop / mobile featured collections
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/studio/explore/preview" target="_blank">
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Preview draft
          </Link>
        </Button>
      </div>

      <div className="space-y-4 rounded-xl border border-border/15 bg-card/30 p-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hero.visible}
            disabled={!canEdit}
            onChange={(e) => updateHero({ visible: e.target.checked })}
          />
          Hero visible
        </label>

        <Input
          value={hero.eyebrow ?? ""}
          disabled={!canEdit}
          onChange={(e) => updateHero({ eyebrow: e.target.value })}
          placeholder="Eyebrow"
          className="bg-background/40"
        />
        <Input
          value={hero.headlineLine1 ?? ""}
          disabled={!canEdit}
          onChange={(e) => updateHero({ headlineLine1: e.target.value })}
          placeholder="Headline line 1"
          className="bg-background/40"
        />
        <Input
          value={hero.headlineLine2 ?? ""}
          disabled={!canEdit}
          onChange={(e) => updateHero({ headlineLine2: e.target.value })}
          placeholder="Headline line 2"
          className="bg-background/40"
        />
        <Input
          value={hero.headlineEmphasis ?? ""}
          disabled={!canEdit}
          onChange={(e) => updateHero({ headlineEmphasis: e.target.value })}
          placeholder="Emphasized word"
          className="bg-background/40"
        />
        <Input
          value={hero.subtitle ?? ""}
          disabled={!canEdit}
          onChange={(e) => updateHero({ subtitle: e.target.value })}
          placeholder="Subtitle"
          className="bg-background/40"
        />
        <Input
          value={hero.editorialHook ?? ""}
          disabled={!canEdit}
          onChange={(e) => updateHero({ editorialHook: e.target.value })}
          placeholder="Editorial hook"
          className="bg-background/40"
        />

        <div className="grid gap-4 border-t border-border/10 pt-4 sm:grid-cols-2">
          <CardTextDisplayEditor
            label="Desktop hero cards"
            value={hero.desktopCardText ?? DESKTOP_HERO_CARD_TEXT}
            disabled={!canEdit}
            onChange={(desktopCardText) => updateHero({ desktopCardText })}
          />
          <CardTextDisplayEditor
            label="Mobile hero cards"
            value={hero.mobileCardText ?? MOBILE_HERO_CARD_TEXT}
            disabled={!canEdit}
            onChange={(mobileCardText) => updateHero({ mobileCardText })}
          />
        </div>

        <div className="space-y-2 border-t border-border/10 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted/45">
            Desktop cinematic
          </p>
          <p className="text-xs text-muted/40">
            Full-width hero card — separate from the featured grid below it.
          </p>
          {hero.cinematicCollectionId ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/15 bg-background/30 px-3 py-2">
              <span className="truncate text-sm font-medium">
                {collectionLabels[hero.cinematicCollectionId] ?? "Unknown collection"}
              </span>
              {canEdit ? (
                <button
                  type="button"
                  className="shrink-0 text-xs text-secondary hover:underline"
                  onClick={() => updateHero({ cinematicCollectionId: undefined })}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted/40">No cinematic collection selected</p>
          )}
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setPickerTarget("cinematic")}>
              {hero.cinematicCollectionId ? "Change cinematic" : "Add cinematic"}
            </Button>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-border/10 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted/45">
            Desktop featured (3)
          </p>
          <p className="text-xs text-muted/40">
            Main card plus two stacked cards in the featured grid — drag to reorder.
          </p>
          {featuredItems.length > 0 ? (
            <SortableList
              items={featuredItems}
              disabled={!canEdit}
              onReorder={(orderedIds) => updateHero({ featuredCollectionIds: orderedIds })}
              renderItem={(item, index) => (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground/85">
                    #{index + 1} {collectionLabels[item.id] ?? "Unknown collection"}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-secondary hover:underline"
                      onClick={() =>
                        updateHero({
                          featuredCollectionIds: hero.featuredCollectionIds.filter(
                            (itemId) => itemId !== item.id
                          ),
                        })
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              )}
            />
          ) : (
            <p className="text-xs text-muted/40">No featured collections yet</p>
          )}
          {canEdit && featuredItems.length < 3 ? (
            <Button variant="outline" size="sm" onClick={() => setPickerTarget("featured")}>
              Add featured
            </Button>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-border/10 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted/45">
            Mobile featured (3)
          </p>
          <p className="text-xs text-muted/40">
            Three picks shown in the mobile hero — independent from desktop cinematic.
          </p>
          {mobileItems.length > 0 ? (
            <SortableList
              items={mobileItems}
              disabled={!canEdit}
              onReorder={(orderedIds) => updateHero({ mobileFeaturedCollectionIds: orderedIds })}
              renderItem={(item, index) => (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground/85">
                    #{index + 1} {collectionLabels[item.id] ?? "Unknown collection"}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-secondary hover:underline"
                      onClick={() =>
                        updateHero({
                          mobileFeaturedCollectionIds: hero.mobileFeaturedCollectionIds.filter(
                            (itemId) => itemId !== item.id
                          ),
                        })
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              )}
            />
          ) : (
            <p className="text-xs text-muted/40">No mobile featured collections yet</p>
          )}
          {canEdit && mobileItems.length < 3 ? (
            <Button variant="outline" size="sm" onClick={() => setPickerTarget("mobile")}>
              Add mobile featured
            </Button>
          ) : null}
        </div>
      </div>

      {canEdit ? (
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
      ) : null}

      {message ? <p className="text-sm text-muted/55">{message}</p> : null}

      {pickerTarget ? (
        <CollectionPicker
          onSelect={(id, name) => {
            addCollection(id, name, pickerTarget);
            setPickerTarget(null);
          }}
          onClose={() => setPickerTarget(null)}
        />
      ) : null}
    </div>
  );
}
