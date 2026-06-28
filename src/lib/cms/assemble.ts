import { unstable_cache } from "next/cache";
import { resolveAssetUrl } from "@/lib/images/assets";
import {
  EXPLORE_PAGE_CACHE_TAG,
  EXPLORE_PAGE_SLUG,
  heroConfigSchema,
  pageSettingsSchema,
  sectionMetadataSchema,
  type ExploreHeroDTO,
  type ExplorePageDTO,
  type ExploreSectionDTO,
  type HeroConfig,
  type SectionLayout,
} from "@/lib/cms/types";
import {
  getCmsPageBySlug,
  getCmsRevision,
  getCmsSectionItems,
  getCmsSections,
  getPublishedExploreCacheKey,
  getTopTagsForCollections,
  loadCollectionsMap,
  mapCollectionToExplore,
  mapFeaturedCollection,
  resolveVariant,
} from "@/lib/cms/queries";
import {
  DESKTOP_GRID_CARD_TEXT,
  DESKTOP_HERO_CARD_TEXT,
  DESKTOP_SCROLL_CARD_TEXT,
  MOBILE_GRID_CARD_TEXT,
  MOBILE_HERO_CARD_TEXT,
  MOBILE_SCROLL_CARD_TEXT,
  parseCardTextDisplay,
  resolveCardTextPair,
} from "@/lib/cms/card-text-display";
import { heroCollectionIdSet, normalizeHeroCollections } from "@/lib/cms/hero-collections";
import type { ExploreCity, ExploreInterest } from "@/lib/explore/types";

const DEFAULT_FILTERS = [{ id: "all", label: "All" }];

const DEFAULT_HERO_COPY = {
  eyebrow: "Curated travel",
  headlineLine1: "Some places",
  headlineLine2: "stay with you.",
  headlineEmphasis: "you.",
  subtitle: "Curated places you'll actually remember.",
};

async function assembleExplorePageUncached(status: "published" | "draft" = "published"): Promise<ExplorePageDTO | null> {
  const page = await getCmsPageBySlug(EXPLORE_PAGE_SLUG);
  if (!page) return null;

  const revision = await getCmsRevision(page.id, status);
  if (!revision) return null;

  const heroParsed = heroConfigSchema.safeParse(revision.hero ?? {});
  const settingsParsed = pageSettingsSchema.safeParse(revision.settings ?? {});
  const heroConfig = heroParsed.success ? heroParsed.data : heroConfigSchema.parse({});
  const settings = settingsParsed.success ? settingsParsed.data : pageSettingsSchema.parse({});

  const sections = (await getCmsSections(revision.id)).filter((section) => section.visible);
  const sectionItems = await getCmsSectionItems(sections.map((section) => section.id));

  const collectionIds = new Set<string>(heroCollectionIdSet(heroConfig));
  for (const item of sectionItems) {
    if (item.collection_id) collectionIds.add(item.collection_id);
  }

  const collectionsMap = await loadCollectionsMap([...collectionIds]);
  const topTagsMap = await getTopTagsForCollections([...collectionIds]);

  const hero = buildHeroDTO(heroConfig, collectionsMap, topTagsMap);
  const sectionDtos = buildSectionDTOs(sections, sectionItems, collectionsMap, topTagsMap);

  return {
    pageSlug: page.slug,
    versionNumber: revision.version_number,
    publishedAt: revision.published_at,
    hero,
    filters: settings.filters.length > 0 ? settings.filters : DEFAULT_FILTERS,
    sections: sectionDtos,
  };
}

function buildHeroDTO(
  config: HeroConfig,
  collectionsMap: Awaited<ReturnType<typeof loadCollectionsMap>>,
  topTagsMap: Awaited<ReturnType<typeof getTopTagsForCollections>>
): ExploreHeroDTO {
  const { cinematicId, featuredIds, mobileIds } = normalizeHeroCollections(config);
  const hasNewFields =
    Boolean(config.cinematicCollectionId) ||
    config.featuredCollectionIds.length > 0 ||
    config.mobileFeaturedCollectionIds.length > 0;

  const mapId = (id: string, index: number) => {
    const collection = collectionsMap.get(id)!;
    const override = config.overrides[id];
    const variant = resolveVariant(id, index, config.variants);
    return mapFeaturedCollection(collection, variant, override, topTagsMap.get(id) ?? []);
  };

  const mobilePickIds = mobileIds.filter((id) => collectionsMap.has(id)).slice(0, 3);
  const picks = mobilePickIds.map((id, index) => mapId(id, index));

  const featuredResolved = featuredIds.filter((id) => collectionsMap.has(id)).slice(0, 3);
  const featuredMainId = featuredResolved[0];
  const featuredStackIds = featuredResolved.slice(1, 3);

  const cinematicResolvedId =
    cinematicId && collectionsMap.has(cinematicId)
      ? cinematicId
      : featuredMainId ?? mobilePickIds[0];

  const fallback = picks[0] ?? emptyFeatured("hero");

  const cinematic =
    cinematicResolvedId && collectionsMap.has(cinematicResolvedId)
      ? mapId(cinematicResolvedId, 0)
      : fallback;

  const featuredMain =
    featuredMainId && collectionsMap.has(featuredMainId) ? mapId(featuredMainId, 0) : fallback;

  const stackTop =
    featuredStackIds[0] && collectionsMap.has(featuredStackIds[0])
      ? mapId(featuredStackIds[0], 1)
      : fallback;

  const stackBottom =
    featuredStackIds[1] && collectionsMap.has(featuredStackIds[1])
      ? mapId(featuredStackIds[1], 2)
      : stackTop;

  const stripId = hasNewFields ? undefined : config.collectionIds[3];
  const strip =
    stripId && collectionsMap.has(stripId)
      ? mapId(stripId, 3)
      : undefined;

  return {
    visible: config.visible,
    eyebrow: config.eyebrow ?? DEFAULT_HERO_COPY.eyebrow,
    headlineLine1: config.headlineLine1 ?? DEFAULT_HERO_COPY.headlineLine1,
    headlineLine2: config.headlineLine2 ?? DEFAULT_HERO_COPY.headlineLine2,
    headlineEmphasis: config.headlineEmphasis ?? DEFAULT_HERO_COPY.headlineEmphasis,
    subtitle: config.subtitle ?? DEFAULT_HERO_COPY.subtitle,
    editorialHook: config.editorialHook,
    featuredBadge: config.featuredBadge,
    imageUrl: config.imageKey ? resolveAssetUrl(config.imageKey) ?? undefined : undefined,
    layout: config.layout,
    metaOnHover: config.metaOnHover,
    desktopCardText: parseCardTextDisplay(config.desktopCardText, DESKTOP_HERO_CARD_TEXT),
    mobileCardText: parseCardTextDisplay(config.mobileCardText, MOBILE_HERO_CARD_TEXT),
    cta: config.cta,
    picks,
    desktop: {
      cinematic,
      featured: {
        main: featuredMain,
        stack: [stackTop, stackBottom],
      },
      strip,
    },
  };
}

function buildSectionDTOs(
  sections: Awaited<ReturnType<typeof getCmsSections>>,
  items: Awaited<ReturnType<typeof getCmsSectionItems>>,
  collectionsMap: Awaited<ReturnType<typeof loadCollectionsMap>>,
  topTagsMap: Awaited<ReturnType<typeof getTopTagsForCollections>>
): ExploreSectionDTO[] {
  const itemsBySection = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsBySection.get(item.section_id) ?? [];
    list.push(item);
    itemsBySection.set(item.section_id, list);
  }

  return sections.map((section) => {
    const sectionItems = itemsBySection.get(section.id) ?? [];
    const metadata = sectionMetadataSchema.parse(section.metadata ?? {});
    const layout = section.layout as SectionLayout;
    const cardDefaults =
      layout === "collection_grid"
        ? { desktop: DESKTOP_GRID_CARD_TEXT, mobile: MOBILE_GRID_CARD_TEXT }
        : { desktop: DESKTOP_SCROLL_CARD_TEXT, mobile: MOBILE_SCROLL_CARD_TEXT };
    const { desktop: cardTextDesktop, mobile: cardTextMobile } = resolveCardTextPair(
      metadata.cardText,
      cardDefaults
    );
    const dto: ExploreSectionDTO = {
      id: section.id,
      slug: section.slug,
      title: section.title,
      subtitle: section.subtitle ?? undefined,
      layout,
      visible: section.visible,
      metadata,
      cardTextDesktop,
      cardTextMobile,
    };

    if (section.layout === "collection_scroll" || section.layout === "collection_grid") {
      dto.collections = sectionItems
        .filter((item) => item.item_type === "collection" && item.collection_id)
        .map((item) => {
          const collection = collectionsMap.get(item.collection_id!);
          if (!collection) return null;
          return mapCollectionToExplore(
            collection,
            item.metadata,
            topTagsMap.get(collection.id) ?? []
          );
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (metadata.cardCount && dto.collections) {
        dto.collections = dto.collections.slice(0, metadata.cardCount);
      }
    }

    if (section.layout === "city_grid") {
      dto.cities = sectionItems
        .filter((item) => item.item_type === "city")
        .map(
          (item): ExploreCity => ({
            id: item.id,
            name: item.label ?? "City",
            imageUrl: resolveAssetUrl(item.image_key) ?? "",
            href: item.href ?? "#",
          })
        );
    }

    if (section.layout === "interest_grid") {
      dto.interests = sectionItems
        .filter((item) => item.item_type === "interest")
        .map(
          (item): ExploreInterest => ({
            id: item.id,
            label: item.label ?? "Interest",
            icon: item.icon ?? "compass",
            href: item.href ?? "#",
          })
        );
    }

    return dto;
  });
}

function emptyFeatured(variant: "hero" | "tall" | "wide") {
  return {
    id: "placeholder",
    variant,
    name: "Featured collection",
    description: "",
    category: "Collection",
    placeCount: 0,
    imageUrl: "",
    href: "#",
  };
}

export async function getPublishedExplorePage(): Promise<ExplorePageDTO | null> {
  const cacheKey = await getPublishedExploreCacheKey();
  return unstable_cache(() => assembleExplorePageUncached("published"), ["explore-page-dto", cacheKey], {
    tags: [EXPLORE_PAGE_CACHE_TAG],
    revalidate: false,
  })();
}

export async function getDraftExplorePage(): Promise<ExplorePageDTO | null> {
  return assembleExplorePageUncached("draft");
}

export { getExplorePreloadUrlsFromDto } from "@/lib/explore/preload-urls";
