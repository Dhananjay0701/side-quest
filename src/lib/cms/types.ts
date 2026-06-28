import { z } from "zod";
import type {
  ExploreCity,
  ExploreCollection,
  ExploreFilter,
  ExploreInterest,
  FeaturedCollection,
} from "@/lib/explore/types";
import { cardTextDisplaySchema, type CardTextDisplay } from "@/lib/cms/card-text-display";

export const EXPLORE_PAGE_SLUG = "explore";
export const EXPLORE_PAGE_CACHE_TAG = "explore-page";

export const SECTION_LAYOUTS = [
  "collection_scroll",
  "collection_grid",
  "city_grid",
  "interest_grid",
  "trust",
  "cta",
] as const;

export type SectionLayout = (typeof SECTION_LAYOUTS)[number];

export const REVISION_STATUSES = ["draft", "published", "archived"] as const;
export type RevisionStatus = (typeof REVISION_STATUSES)[number];

export const ITEM_TYPES = ["collection", "city", "interest", "custom"] as const;
export type SectionItemType = (typeof ITEM_TYPES)[number];

export const heroConfigSchema = z.object({
  visible: z.boolean().default(true),
  eyebrow: z.string().optional(),
  headlineLine1: z.string().optional(),
  headlineLine2: z.string().optional(),
  headlineEmphasis: z.string().optional(),
  subtitle: z.string().optional(),
  editorialHook: z.string().optional(),
  featuredBadge: z.string().optional(),
  imageKey: z.string().optional(),
  layout: z.enum(["cinematic", "featured_grid", "mobile_stack"]).default("featured_grid"),
  metaOnHover: z.boolean().default(true),
  desktopCardText: cardTextDisplaySchema.optional(),
  mobileCardText: cardTextDisplaySchema.optional(),
  cta: z
    .object({
      label: z.string(),
      href: z.string(),
    })
    .optional(),
  collectionIds: z.array(z.string().uuid()).default([]),
  cinematicCollectionId: z.string().uuid().optional(),
  featuredCollectionIds: z.array(z.string().uuid()).max(3).default([]),
  mobileFeaturedCollectionIds: z.array(z.string().uuid()).max(3).default([]),
  variants: z.record(z.string(), z.enum(["hero", "tall", "wide"])).default({}),
  overrides: z
    .record(
      z.string(),
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        tag: z.string().optional(),
        duration: z.string().optional(),
        editorialCue: z.string().optional(),
        imageKey: z.string().optional(),
      })
    )
    .default({}),
});

export type HeroConfig = z.infer<typeof heroConfigSchema>;

export const pageSettingsSchema = z.object({
  filters: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
      })
    )
    .default([]),
});

export type PageSettings = z.infer<typeof pageSettingsSchema>;

export const sectionMetadataSchema = z
  .object({
    desktopTitle: z.string().optional(),
    viewAllHref: z.string().optional(),
    cardCount: z.number().int().positive().optional(),
    badgePrefix: z.string().optional(),
    cardText: z
      .object({
        desktop: cardTextDisplaySchema.optional(),
        mobile: cardTextDisplaySchema.optional(),
      })
      .optional(),
  })
  .passthrough();

export type SectionMetadata = z.infer<typeof sectionMetadataSchema>;

export interface ExploreHeroDTO {
  visible: boolean;
  eyebrow?: string;
  headlineLine1?: string;
  headlineLine2?: string;
  headlineEmphasis?: string;
  subtitle?: string;
  editorialHook?: string;
  featuredBadge?: string;
  imageUrl?: string;
  layout: "cinematic" | "featured_grid" | "mobile_stack";
  metaOnHover: boolean;
  desktopCardText: CardTextDisplay;
  mobileCardText: CardTextDisplay;
  cta?: { label: string; href: string };
  picks: FeaturedCollection[];
  desktop: {
    cinematic: FeaturedCollection;
    featured: {
      main: FeaturedCollection;
      stack: readonly [FeaturedCollection, FeaturedCollection];
    };
    strip?: FeaturedCollection;
  };
}

export interface ExploreSectionDTO {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  layout: SectionLayout;
  visible: boolean;
  metadata: SectionMetadata;
  cardTextDesktop: CardTextDisplay;
  cardTextMobile: CardTextDisplay;
  collections?: ExploreCollection[];
  cities?: ExploreCity[];
  interests?: ExploreInterest[];
}

export interface ExplorePageDTO {
  pageSlug: string;
  versionNumber: number;
  publishedAt: string | null;
  hero: ExploreHeroDTO;
  filters: ExploreFilter[];
  sections: ExploreSectionDTO[];
}

export interface CmsPageRow {
  id: string;
  slug: string;
  name: string;
}

export interface CmsRevisionRow {
  id: string;
  page_id: string;
  version_number: number;
  status: RevisionStatus;
  hero: HeroConfig;
  settings: PageSettings;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  published_at: string | null;
  published_by: string | null;
}

export interface CmsSectionRow {
  id: string;
  revision_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  layout: SectionLayout;
  sort_order: number;
  visible: boolean;
  metadata: SectionMetadata;
}

export interface CmsSectionItemRow {
  id: string;
  section_id: string;
  item_type: SectionItemType;
  collection_id: string | null;
  sort_order: number;
  label: string | null;
  image_key: string | null;
  href: string | null;
  icon: string | null;
  metadata: Record<string, unknown>;
}

export interface CmsAuditLogRow {
  id: string;
  page_id: string | null;
  revision_id: string | null;
  action: string;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CmsEditorPayload {
  page: CmsPageRow;
  revision: CmsRevisionRow;
  sections: Array<CmsSectionRow & { items: CmsSectionItemRow[] }>;
  history: CmsAuditLogRow[];
}
