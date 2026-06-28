/**
 * Seeds the Explore CMS with initial published content from public collections.
 *
 * Usage:
 *   npm run seed-explore-cms
 *   npm run seed-explore-cms -- --profile-id <uuid>   # set profile role to owner
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  EXPLORE_FILTERS,
  EXPLORE_CITIES,
  EXPLORE_INTERESTS,
  FEATURED_COLLECTIONS,
  TRENDING_COLLECTIONS,
  OFFICIAL_COLLECTIONS,
} from "../src/lib/explore/placeholder-data";

const ROOT = path.resolve(import.meta.dirname, "..");

async function loadEnvFile() {
  const envPath = path.join(ROOT, ".env.local");
  return readFile(envPath, "utf8")
    .then((content) => {
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    })
    .catch(() => {
      /* .env.local optional when vars are already exported */
    });
}

function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local."
    );
  }
  return createClient(url, key);
}

async function grantOwnerRole(supabase: SupabaseClient, profileId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ role: "owner" })
    .eq("id", profileId);
  if (error) throw error;
  console.log(`Set profile ${profileId} role to owner`);
}

async function main() {
  await loadEnvFile();
  const supabase = createSupabaseAdmin();

  const profileIdArg = process.argv.find((arg) => arg.startsWith("--profile-id="))?.split("=")[1]
    ?? process.argv[process.argv.indexOf("--profile-id") + 1];

  const { data: page, error: pageError } = await supabase
    .from("cms_pages")
    .select("id")
    .eq("slug", "explore")
    .single();

  if (pageError) throw pageError;

  const { data: existingPublished } = await supabase
    .from("cms_page_revisions")
    .select("id")
    .eq("page_id", page.id)
    .eq("status", "published")
    .maybeSingle();

  if (existingPublished) {
    console.log("Explore CMS already seeded (published revision exists). Skipping.");
    if (profileIdArg) {
      await grantOwnerRole(supabase, profileIdArg);
    }
    return;
  }

  const { data: publicCollections } = await supabase
    .from("collections")
    .select("id, name")
    .eq("is_public", true)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false })
    .limit(8);

  const collectionIds = (publicCollections ?? []).map((c) => c.id as string);

  const heroCollectionIds =
    collectionIds.length >= 4
      ? collectionIds.slice(0, 4)
      : FEATURED_COLLECTIONS.map((_, index) => collectionIds[index]).filter(Boolean);

  const { data: revision, error: revisionError } = await supabase
    .from("cms_page_revisions")
    .insert({
      page_id: page.id,
      version_number: 1,
      status: "published",
      hero: {
        visible: true,
        eyebrow: "Curated travel",
        headlineLine1: "Some places",
        headlineLine2: "stay with you.",
        headlineEmphasis: "you.",
        subtitle: "Curated places you'll actually remember.",
        editorialHook: "Editor's Pick",
        metaOnHover: true,
        layout: "featured_grid",
        collectionIds: heroCollectionIds,
        variants: {},
        overrides: {},
      },
      settings: {
        filters: EXPLORE_FILTERS,
      },
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (revisionError) throw revisionError;

  const sections = [
    {
      slug: "trending",
      title: "Trending this week",
      layout: "collection_scroll",
      metadata: { desktopTitle: "🔥 Trending This Week" },
      items: (publicCollections ?? TRENDING_COLLECTIONS)
        .slice(0, 4)
        .map((item, index) => ({
          item_type: "collection" as const,
          collection_id: "id" in item ? item.id : collectionIds[index] ?? null,
          sort_order: index,
          metadata: "tag" in item ? { tag: item.tag } : {},
        }))
        .filter((item) => item.collection_id),
    },
    {
      slug: "official",
      title: "Official curated",
      layout: "collection_grid",
      metadata: {
        desktopTitle: "⭐ Random SideQuest Originals",
        badgePrefix: "Random SideQuest Original",
      },
      items: (publicCollections ?? OFFICIAL_COLLECTIONS)
        .slice(0, 3)
        .map((item, index) => ({
          item_type: "collection" as const,
          collection_id: "id" in item ? item.id : collectionIds[index + 4] ?? null,
          sort_order: index,
          metadata: {},
        }))
        .filter((item) => item.collection_id),
    },
    {
      slug: "cities",
      title: "Destinations",
      layout: "city_grid",
      metadata: { desktopTitle: "Browse Destinations" },
      items: EXPLORE_CITIES.map((city, index) => ({
        item_type: "city" as const,
        label: city.name,
        image_key: city.imageUrl,
        href: city.href === "#" ? `/search?q=${encodeURIComponent(city.name)}` : city.href,
        sort_order: index,
        metadata: {},
      })),
    },
    {
      slug: "interests",
      title: "Discover by interest",
      layout: "interest_grid",
      metadata: { desktopTitle: "Browse by Interest" },
      items: EXPLORE_INTERESTS.map((interest, index) => ({
        item_type: "interest" as const,
        label: interest.label,
        icon: interest.icon,
        href: interest.href === "#" ? `/search?q=${encodeURIComponent(interest.label)}` : interest.href,
        sort_order: index,
        metadata: {},
      })),
    },
    {
      slug: "trust",
      title: "How we curate",
      layout: "trust",
      metadata: {},
      items: [],
    },
    {
      slug: "cta",
      title: "Unlock 100+ curated collections",
      layout: "cta",
      metadata: {},
      items: [],
    },
  ];

  for (const [index, section] of sections.entries()) {
    const { data: sectionRow, error: sectionError } = await supabase
      .from("cms_sections")
      .insert({
        revision_id: revision.id,
        slug: section.slug,
        title: section.title,
        layout: section.layout,
        sort_order: index,
        visible: true,
        metadata: section.metadata,
      })
      .select("id")
      .single();

    if (sectionError) throw sectionError;

    if (section.items.length > 0) {
      const { error: itemsError } = await supabase.from("cms_section_items").insert(
        section.items.map((item) => ({
          section_id: sectionRow.id,
          ...item,
        }))
      );
      if (itemsError) throw itemsError;
    }
  }

  const { data: draftRevision, error: draftError } = await supabase
    .from("cms_page_revisions")
    .insert({
      page_id: page.id,
      version_number: 2,
      status: "draft",
      hero: {
        visible: true,
        eyebrow: "Curated travel",
        headlineLine1: "Some places",
        headlineLine2: "stay with you.",
        headlineEmphasis: "you.",
        subtitle: "Curated places you'll actually remember.",
        editorialHook: "Editor's Pick",
        metaOnHover: true,
        layout: "featured_grid",
        collectionIds: heroCollectionIds,
        variants: {},
        overrides: {},
      },
      settings: { filters: EXPLORE_FILTERS },
    })
    .select("id")
    .single();

  if (draftError) throw draftError;

  const { data: publishedSections } = await supabase
    .from("cms_sections")
    .select("id, slug, title, subtitle, layout, sort_order, visible, metadata")
    .eq("revision_id", revision.id)
    .order("sort_order", { ascending: true });

  for (const section of publishedSections ?? []) {
    const { data: draftSection, error: draftSectionError } = await supabase
      .from("cms_sections")
      .insert({
        revision_id: draftRevision.id,
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

    if (draftSectionError) throw draftSectionError;

    const { data: sectionItems } = await supabase
      .from("cms_section_items")
      .select(
        "item_type, collection_id, sort_order, label, image_key, href, icon, metadata"
      )
      .eq("section_id", section.id)
      .order("sort_order", { ascending: true });

    if (sectionItems?.length) {
      const { error: draftItemsError } = await supabase.from("cms_section_items").insert(
        sectionItems.map((item) => ({
          section_id: draftSection.id,
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
      if (draftItemsError) throw draftItemsError;
    }
  }

  if (profileIdArg) {
    await grantOwnerRole(supabase, profileIdArg);
  }

  console.log("Explore CMS seeded with published revision v1 and draft v2.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
