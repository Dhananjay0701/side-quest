#!/usr/bin/env node
/**
 * Generate 2 editorial collections per city from CSV data using Gemini.
 *
 * 6-step editorial pipeline, 3 API calls (token-optimized):
 *   Step 1  — Candidate collections (4–6 pitches)
 *   Step 2+3 — Critique candidates → finalize exactly 2 collections
 *   Step 4+5+6 — Draft + critique + finalize metadata for selected places only
 *
 * Artifacts: data/generated/{city}/candidates.json, collection-critiques.json,
 *            collections.json, enriched-places.json, pipeline-manifest.json
 *
 * Usage:
 *   npm run generate-city-collections -- paris
 *   npm run generate-city-collections -- paris --upload --user-id <profile-uuid>
 *   npm run generate-city-collections -- paris --force   # ignore cached steps
 *
 * Env (.env.local): GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: CURATED_USER_ID (profile id for collection owner)
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import Papa from "papaparse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AUDIENCE_OPTIONS, CATEGORY_SLUGS, PROMPT_VERSION, VIBE_OPTIONS } from "@/lib/constants";
import {
  CANDIDATE_COLLECTIONS_MAX,
  CANDIDATE_COLLECTIONS_MIN,
  COLLECTIONS_PER_CITY,
  PLACES_PER_COLLECTION_MAX,
  PLACES_PER_COLLECTION_MIN,
  STEP1_CANDIDATE_COLLECTIONS_PROMPT,
  STEP2_3_CRITIQUE_AND_FINALIZE_PROMPT,
  STEP4_6_DRAFT_CRITIQUE_AND_FINALIZE_PROMPT,
  STUB_DESCRIPTION_MAX_CHARS,
} from "./lib/city-collection-prompts";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaceholderCoverUrl } from "@/lib/images/collage";
import { buildSearchText, extractGooglePlaceId } from "@/lib/utils/google-maps";
import { slugify } from "@/lib/utils";
import { getEnrichmentModel } from "@/lib/enrich/gemini";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CITIES_DIR = path.join(ROOT, "data", "cities");
const OUTPUT_DIR = path.join(ROOT, "data", "generated");

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? getEnrichmentModel();
const ENRICH_BATCH_SIZE = 35;

/** Extract the first complete JSON value; handles trailing prose and markdown fences. */
function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```/);
  const cleaned = (fenceMatch ? fenceMatch[1] : trimmed).trim();

  try {
    return JSON.parse(cleaned);
  } catch (directErr) {
    const start = cleaned.indexOf("{");
    if (start === -1) throw directErr;

    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) {
          return JSON.parse(cleaned.slice(start, i + 1));
        }
      }
    }
    throw directErr;
  }
}

// --- env -------------------------------------------------------------------

function loadEnvFile() {
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

// --- CLI -------------------------------------------------------------------

interface CliOptions {
  citySlug: string;
  limit?: number;
  dryRun: boolean;
  upload: boolean;
  force: boolean;
  collectionIndex?: number;
  userId?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.filter((a) => !a.startsWith("-"));
  const flags = new Set(argv.filter((a) => a.startsWith("--")));

  const citySlug = args[0];
  if (!citySlug) {
    console.error("Usage: npm run generate-city-collections -- <city-slug> [options]");
    console.error("Example: npm run generate-city-collections -- paris --upload");
    process.exit(1);
  }

  const limitFlag = argv.find((a) => a.startsWith("--limit"));
  const limit = limitFlag
    ? Number(limitFlag.split("=")[1] ?? argv[argv.indexOf(limitFlag) + 1])
    : undefined;

  const collectionFlag = argv.find((a) => a.startsWith("--collection"));
  const collectionIndex = collectionFlag
    ? Number(collectionFlag.split("=")[1] ?? argv[argv.indexOf(collectionFlag) + 1])
    : undefined;

  const userIdFlag = argv.find((a) => a.startsWith("--user-id"));
  const userId =
    userIdFlag?.split("=")[1] ??
    (userIdFlag ? argv[argv.indexOf(userIdFlag) + 1] : undefined) ??
    process.env.CURATED_USER_ID;

  return {
    citySlug: citySlug.replace(/\.csv$/, ""),
    limit: Number.isFinite(limit) ? limit : undefined,
    dryRun: flags.has("--dry-run"),
    upload: flags.has("--upload"),
    force: flags.has("--force"),
    collectionIndex: Number.isFinite(collectionIndex) ? collectionIndex : undefined,
    userId,
  };
}

// --- CSV -------------------------------------------------------------------

interface CityCsvRow {
  city: string;
  country: string;
  neighborhood: string;
  place_name: string;
  description: string;
  address: string;
  google_maps_url: string;
  latitude: string;
  longitude: string;
  category: string;
}

interface CityPlace extends CityCsvRow {
  id: string;
}

function truncateDescription(text: string, max = STUB_DESCRIPTION_MAX_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function toPlaceStubs(places: CityPlace[]) {
  return places.map(({ id, place_name, description, category }) => ({
    id,
    place_name,
    description: truncateDescription(description),
    source_category: category || null,
  }));
}

function toPlaceIndex(places: CityPlace[]) {
  return places.map(({ id, place_name }) => ({ id, place_name }));
}

function toPlaceRecords(rows: CityCsvRow[]): { place_name: string; description: string }[] {
  return rows.map(({ place_name, description }) => ({ place_name, description }));
}

async function readCityCsv(citySlug: string, limit?: number): Promise<CityPlace[]> {
  const csvPath = path.join(CITIES_DIR, `${citySlug}.csv`);
  const content = await readFile(csvPath, "utf8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  }

  const places: CityPlace[] = [];

  for (const row of parsed.data) {
    const place_name = row.place_name?.trim();
    const description = row.description?.trim();
    const google_maps_url = row.google_maps_url?.trim();

    if (!place_name || !description || !google_maps_url) continue;

    places.push({
      id: `p_${places.length}`,
      city: row.city?.trim() ?? "",
      country: row.country?.trim() ?? "",
      neighborhood: row.neighborhood?.trim() ?? "",
      place_name,
      description,
      address: row.address?.trim() ?? "",
      google_maps_url,
      latitude: row.latitude?.trim() ?? "",
      longitude: row.longitude?.trim() ?? "",
      category: row.category?.trim() ?? "",
    });

    if (limit && places.length >= limit) break;
  }

  if (places.length === 0) {
    throw new Error(`No usable rows in ${csvPath} (need place_name, description, google_maps_url)`);
  }

  const minPlacesNeeded = COLLECTIONS_PER_CITY * PLACES_PER_COLLECTION_MIN;
  if (places.length < minPlacesNeeded) {
    throw new Error(
      `${csvPath} has only ${places.length} places; need at least ${minPlacesNeeded} for ${COLLECTIONS_PER_CITY} collections`
    );
  }

  return places;
}

// --- Gemini ----------------------------------------------------------------

async function generateGeminiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.25,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

// --- schemas ---------------------------------------------------------------

const collectionDnaSchema = z.object({
  history: z.number().int().min(0).max(10),
  food: z.number().int().min(0).max(10),
  nightlife: z.number().int().min(0).max(10),
  walking: z.number().int().min(0).max(10),
  luxury: z.number().int().min(0).max(10),
  photography: z.number().int().min(0).max(10),
  romance: z.number().int().min(0).max(10),
  budget: z.number().int().min(0).max(10),
});

const collectionPlaceFields = {
  title: z.string().min(1),
  subtitle: z.string(),
  editorial_description: z.string(),
  why_enjoy: z.string(),
  grouping_story: z.string().optional(),
  target_audience: z.string(),
  mood: z.array(z.string()).min(1).max(6),
  best_season: z.string(),
  estimated_duration: z.string(),
  confidence: z.number().min(0).max(1),
  dna: collectionDnaSchema.optional(),
  place_ids: z.array(z.string()).min(PLACES_PER_COLLECTION_MIN).max(PLACES_PER_COLLECTION_MAX),
  place_reasons: z.record(z.string(), z.string()),
  surprise_place_ids: z.array(z.string()).min(1).optional(),
};

const candidateCollectionSchema = z.object({
  candidate_id: z.string(),
  ...collectionPlaceFields,
});

const editorialCollectionSchema = z.object({
  collection_id: z.string(),
  ...collectionPlaceFields,
  cover_image_prompt: z.string(),
  visit_order_rationale: z.string(),
});

const candidatesResponseSchema = z.object({
  candidates: z
    .array(candidateCollectionSchema)
    .min(CANDIDATE_COLLECTIONS_MIN)
    .max(CANDIDATE_COLLECTIONS_MAX),
  generation_notes: z.string().optional(),
});

const collectionCritiqueSchema = z.object({
  candidate_id: z.string(),
  verdict: z.enum(["keep", "revise", "reject"]),
  scores: z.object({
    memorable: z.number().int().min(1).max(5),
    unique: z.number().int().min(1).max(5),
    emotionally_compelling: z.number().int().min(1).max(5),
    save_worthy: z.number().int().min(1).max(5),
    story_coherence: z.number().int().min(1).max(5),
  }),
  issues: z.array(z.string()),
  passes_grouping_test: z.boolean().nullish(),
  has_surprise_place: z.boolean().nullish(),
  // Gemini often returns null for unused improvement fields — nullish accepts null | undefined
  improvements: z
    .object({
      title: z.string().nullish(),
      subtitle: z.string().nullish(),
      editorial_description: z.string().nullish(),
      grouping_story: z.string().nullish(),
      place_ids_add: z.array(z.string()).nullish(),
      place_ids_remove: z.array(z.string()).nullish(),
      place_reasons_patch: z.record(z.string(), z.string()).nullish(),
      reorder_place_ids: z.array(z.string()).nullish(),
      surprise_place_ids: z.array(z.string()).nullish(),
      dna: collectionDnaSchema.nullish(),
    })
    .nullish(),
  duplicate_theme_with: z.array(z.string()).nullish(),
  missing_opportunity: z.string().nullish(),
});

const critiqueAndFinalizeResponseSchema = z.object({
  critiques: z.array(collectionCritiqueSchema).min(1),
  global_issues: z.array(z.string()).optional(),
  collections: z.array(editorialCollectionSchema).length(COLLECTIONS_PER_CITY),
  rejected_candidate_ids: z.array(z.string()),
  editorial_notes: z.string().optional(),
  critique_summary: z.array(z.string()).optional(),
});

const enrichedPlaceSchema = z.object({
  id: z.string(),
  place_name: z.string(),
  one_sentence_description: z.string().max(400),
  category: z.enum(CATEGORY_SLUGS),
  subcategory: z.string(),
  audience: z.enum(AUDIENCE_OPTIONS),
  vibes: z.array(z.string()).min(1).max(8),
  hidden_gem_score: z.number().min(0).max(1),
  touristy_score: z.number().min(0).max(1),
  indoor_outdoor: z.enum(["indoor", "outdoor", "both"]),
  family_friendly: z.boolean(),
  date_friendly: z.boolean(),
  solo_friendly: z.boolean(),
  digital_nomad_friendly: z.boolean(),
  visit_duration: z.string(),
  ideal_visit_time: z.string(),
  estimated_cost: z.enum(["budget", "mid", "splurge", "free"]),
  photography_tags: z.array(z.string()).max(6),
  search_keywords: z.array(z.string()).min(1).max(12),
  confidence: z.number().min(0).max(1),
  assumptions: z
    .union([z.array(z.string()), z.string(), z.null()])
    .optional()
    .transform((v) => (v == null ? [] : Array.isArray(v) ? v : [v])),
});

const placeMetadataFinalizeResponseSchema = z.object({
  places: z.array(enrichedPlaceSchema),
  editorial_notes: z.string().optional(),
  quality_scores: z
    .object({
      avg_description_uniqueness: z.number().min(0).max(1).optional(),
      cliche_count: z.number().int().min(0).optional(),
      low_confidence_count: z.number().int().min(0).optional(),
    })
    .optional(),
  critique_summary: z.array(z.string()).optional(),
});

export type CandidateCollection = z.infer<typeof candidateCollectionSchema>;
export type CollectionCritique = z.infer<typeof collectionCritiqueSchema>;
export type EnrichedPlace = z.infer<typeof enrichedPlaceSchema>;
export type EditorialCollection = z.infer<typeof editorialCollectionSchema>;

type PipelineStep = "1" | "2+3" | "4+5+6";

interface PipelineManifest {
  city: string;
  model: string;
  pipeline: string;
  source_place_count: number;
  source_limit: number | null;
  steps_completed: PipelineStep[];
  selected_place_ids?: string[];
  constraints: {
    collections_per_city: number;
    places_per_collection: string;
  };
  updated_at: string;
}

interface ArtifactPaths {
  outDir: string;
  candidates: string;
  critiques: string;
  collections: string;
  enriched: string;
  manifest: string;
}

function artifactPaths(citySlug: string): ArtifactPaths {
  const outDir = path.join(OUTPUT_DIR, citySlug);
  return {
    outDir,
    candidates: path.join(outDir, "candidates.json"),
    critiques: path.join(outDir, "collection-critiques.json"),
    collections: path.join(outDir, "collections.json"),
    enriched: path.join(outDir, "enriched-places.json"),
    manifest: path.join(outDir, "pipeline-manifest.json"),
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function cacheMatchesInput(
  manifest: PipelineManifest | null,
  citySlug: string,
  placeCount: number,
  limit?: number
): boolean {
  if (!manifest) return false;
  if (manifest.city !== citySlug) return false;
  if (manifest.source_place_count !== placeCount) return false;
  if (manifest.source_limit !== (limit ?? null)) return false;
  return true;
}

function stepCompleted(manifest: PipelineManifest | null, step: PipelineStep): boolean {
  return manifest?.steps_completed.includes(step) ?? false;
}

function baseManifest(
  citySlug: string,
  placeCount: number,
  limit?: number
): PipelineManifest {
  return {
    city: citySlug,
    model: GEMINI_MODEL,
    pipeline: "6-step editorial (3 API calls)",
    source_place_count: placeCount,
    source_limit: limit ?? null,
    steps_completed: [],
    constraints: {
      collections_per_city: COLLECTIONS_PER_CITY,
      places_per_collection: `${PLACES_PER_COLLECTION_MIN}-${PLACES_PER_COLLECTION_MAX}`,
    },
    updated_at: new Date().toISOString(),
  };
}

async function writeManifest(paths: ArtifactPaths, manifest: PipelineManifest) {
  manifest.updated_at = new Date().toISOString();
  await writeFile(paths.manifest, JSON.stringify(manifest, null, 2));
}

async function markStepComplete(
  paths: ArtifactPaths,
  manifest: PipelineManifest,
  step: PipelineStep,
  extra?: Partial<PipelineManifest>
) {
  if (!manifest.steps_completed.includes(step)) {
    manifest.steps_completed.push(step);
  }
  Object.assign(manifest, extra);
  await writeManifest(paths, manifest);
}

async function loadCachedStep1(
  paths: ArtifactPaths,
  validIds: Set<string>
): Promise<{ candidates: CandidateCollection[]; generation_notes?: string } | null> {
  const data = await readJsonFile<{ candidates: unknown; generation_notes?: string }>(paths.candidates);
  if (!data) return null;
  const parsed = candidatesResponseSchema.safeParse(data);
  if (!parsed.success) return null;
  try {
    validateCollectionPlaces(parsed.data.candidates, validIds, "Cached candidate");
  } catch {
    return null;
  }
  return parsed.data;
}

async function loadCachedStep23(
  paths: ArtifactPaths,
  validIds: Set<string>
): Promise<{
  critiques: CollectionCritique[];
  global_issues?: string[];
  collections: EditorialCollection[];
  rejected_candidate_ids: string[];
  editorial_notes?: string;
  critique_summary?: string[];
} | null> {
  const collData = await readJsonFile<{ collections: unknown }>(paths.collections);
  const critiqueData = await readJsonFile<{
    critiques: unknown;
    global_issues?: string[];
    rejected_candidate_ids?: string[];
    editorial_notes?: string;
    critique_summary?: string[];
  }>(paths.critiques);
  if (!collData || !critiqueData) return null;

  const collectionsParsed = z
    .object({ collections: z.array(editorialCollectionSchema).length(COLLECTIONS_PER_CITY) })
    .safeParse(collData);
  const critiquesParsed = z
    .object({
      critiques: z.array(collectionCritiqueSchema).min(1),
      global_issues: z.array(z.string()).optional(),
      rejected_candidate_ids: z.array(z.string()).optional(),
      editorial_notes: z.string().optional(),
      critique_summary: z.array(z.string()).optional(),
    })
    .safeParse(critiqueData);

  if (!collectionsParsed.success || !critiquesParsed.success) return null;

  try {
    validateCollectionPlaces(collectionsParsed.data.collections, validIds, "Cached final collection");
  } catch {
    return null;
  }

  return {
    critiques: critiquesParsed.data.critiques,
    global_issues: critiquesParsed.data.global_issues,
    collections: collectionsParsed.data.collections,
    rejected_candidate_ids: critiquesParsed.data.rejected_candidate_ids ?? [],
    editorial_notes: critiquesParsed.data.editorial_notes ?? critiqueData.editorial_notes,
    critique_summary: critiquesParsed.data.critique_summary ?? critiqueData.critique_summary,
  };
}

const cachedEnrichedFileSchema = z.object({
  places: z.array(enrichedPlaceSchema),
  editorial_notes: z.union([z.array(z.string()), z.string()]).optional(),
  quality_scores: z.array(z.record(z.string(), z.unknown())).optional(),
  critique_summaries: z.array(z.array(z.string())).optional(),
});

async function loadCachedEnrichedPlaces(
  paths: ArtifactPaths,
  requiredIds: string[]
): Promise<{
  places: EnrichedPlace[];
  editorial_notes: string[];
  quality_scores: NonNullable<
    z.infer<typeof placeMetadataFinalizeResponseSchema>["quality_scores"]
  >[];
  critique_summaries: string[][];
} | null> {
  const data = await readJsonFile<unknown>(paths.enriched);
  if (!data) return null;
  const parsed = cachedEnrichedFileSchema.safeParse(data);
  if (!parsed.success) return null;

  const byId = new Map(parsed.data.places.map((p) => [p.id, p]));
  if (!requiredIds.every((id) => byId.has(id))) return null;

  const editorial_notes = Array.isArray(parsed.data.editorial_notes)
    ? parsed.data.editorial_notes
    : parsed.data.editorial_notes
      ? [parsed.data.editorial_notes]
      : [];

  return {
    places: requiredIds.map((id) => byId.get(id)!),
    editorial_notes,
    quality_scores: (parsed.data.quality_scores ?? []) as NonNullable<
      z.infer<typeof placeMetadataFinalizeResponseSchema>["quality_scores"]
    >[],
    critique_summaries: parsed.data.critique_summaries ?? [],
  };
}

async function saveStep1Artifact(
  paths: ArtifactPaths,
  citySlug: string,
  step1: { candidates: CandidateCollection[]; generation_notes?: string },
  manifest: PipelineManifest
) {
  await writeFile(
    paths.candidates,
    JSON.stringify({ city: citySlug, model: GEMINI_MODEL, ...step1 }, null, 2)
  );
  await markStepComplete(paths, manifest, "1");
}

async function saveStep23Artifacts(
  paths: ArtifactPaths,
  citySlug: string,
  step23: {
    critiques: CollectionCritique[];
    global_issues?: string[];
    collections: EditorialCollection[];
    rejected_candidate_ids: string[];
    editorial_notes?: string;
    critique_summary?: string[];
  },
  manifest: PipelineManifest
) {
  await writeFile(
    paths.critiques,
    JSON.stringify(
      {
        city: citySlug,
        model: GEMINI_MODEL,
        critiques: step23.critiques,
        global_issues: step23.global_issues,
        rejected_candidate_ids: step23.rejected_candidate_ids,
        critique_summary: step23.critique_summary,
        editorial_notes: step23.editorial_notes,
      },
      null,
      2
    )
  );
  await writeFile(
    paths.collections,
    JSON.stringify(
      {
        city: citySlug,
        model: GEMINI_MODEL,
        collections: step23.collections,
        editorial_notes: step23.editorial_notes,
        critique_summary: step23.critique_summary,
      },
      null,
      2
    )
  );
  const selectedIds = selectedPlaceIds(step23.collections);
  await markStepComplete(paths, manifest, "2+3", { selected_place_ids: selectedIds });
}

async function saveStep456Artifact(
  paths: ArtifactPaths,
  citySlug: string,
  step456: {
    places: EnrichedPlace[];
    editorial_notes: string[];
    quality_scores: NonNullable<
      z.infer<typeof placeMetadataFinalizeResponseSchema>["quality_scores"]
    >[];
    critique_summaries: string[][];
  },
  manifest: PipelineManifest
) {
  await writeFile(
    paths.enriched,
    JSON.stringify(
      {
        city: citySlug,
        model: GEMINI_MODEL,
        place_count: step456.places.length,
        places: step456.places,
        editorial_notes: step456.editorial_notes,
        quality_scores: step456.quality_scores,
        critique_summaries: step456.critique_summaries,
      },
      null,
      2
    )
  );
  await markStepComplete(paths, manifest, "4+5+6");
}

function pickLikelyVibe(vibes: string[]): (typeof VIBE_OPTIONS)[number] {
  const normalized = vibes.map((v) => v.toLowerCase().replace(/\s+/g, "-"));
  for (const option of VIBE_OPTIONS) {
    if (normalized.some((v) => v.includes(option) || option.includes(v))) return option;
  }
  return "cultural";
}

type CollectionWithPlaces = {
  title: string;
  place_ids: string[];
  place_reasons: Record<string, string>;
  surprise_place_ids?: string[];
};

function validateCollectionPlaces(
  collections: CollectionWithPlaces[],
  validIds: Set<string>,
  label: string
): void {
  for (const coll of collections) {
    const invalid = coll.place_ids.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new Error(`${label} "${coll.title}" references unknown place ids: ${invalid.join(", ")}`);
    }
    for (const id of coll.place_ids) {
      if (!coll.place_reasons[id]) {
        throw new Error(`${label} "${coll.title}" missing reason for place ${id}`);
      }
    }
    if (coll.place_ids.length < PLACES_PER_COLLECTION_MIN || coll.place_ids.length > PLACES_PER_COLLECTION_MAX) {
      throw new Error(
        `${label} "${coll.title}" has ${coll.place_ids.length} places; need ${PLACES_PER_COLLECTION_MIN}–${PLACES_PER_COLLECTION_MAX}`
      );
    }
    const withSurprise = coll as CollectionWithPlaces & { surprise_place_ids?: string[] };
    if (withSurprise.surprise_place_ids?.length) {
      const bad = withSurprise.surprise_place_ids.filter((id) => !coll.place_ids.includes(id));
      if (bad.length > 0) {
        throw new Error(`${label} "${coll.title}" surprise_place_ids not in place_ids: ${bad.join(", ")}`);
      }
    }
  }
}

async function step1GenerateCandidates(
  city: string,
  country: string,
  places: CityPlace[]
): Promise<{ candidates: CandidateCollection[]; generation_notes?: string }> {
  const validIds = new Set(places.map((p) => p.id));
  const baseInput = { city, country, place_count: places.length, places: toPlaceStubs(places) };
  const maxAttempts = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const userPrompt = JSON.stringify(
      attempt === 1
        ? baseInput
        : {
            ...baseInput,
            validation_error: lastError,
            reminder: `Every candidate must have exactly ${PLACES_PER_COLLECTION_MIN}–${PLACES_PER_COLLECTION_MAX} place_ids, grouping_story, dna, and surprise_place_ids (≥1). Reject generic category dumps.`,
          },
      null,
      0
    );

    const raw = await generateGeminiJson(STEP1_CANDIDATE_COLLECTIONS_PROMPT, userPrompt);
    const parsed = candidatesResponseSchema.safeParse(parseGeminiJson(raw));

    if (!parsed.success) {
      lastError = parsed.error.message;
      if (attempt === maxAttempts) {
        throw new Error(`Step 1 invalid output: ${lastError}\n${raw.slice(0, 500)}`);
      }
      continue;
    }

    try {
      validateCollectionPlaces(parsed.data.candidates, validIds, "Candidate");
      return parsed.data;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === maxAttempts) throw err;
    }
  }

  throw new Error(`Step 1 failed after ${maxAttempts} attempts`);
}

async function step2and3CritiqueAndFinalize(
  city: string,
  country: string,
  candidates: CandidateCollection[],
  places: CityPlace[]
): Promise<{
  critiques: CollectionCritique[];
  global_issues?: string[];
  collections: EditorialCollection[];
  rejected_candidate_ids: string[];
  editorial_notes?: string;
  critique_summary?: string[];
}> {
  const validIds = new Set(places.map((p) => p.id));
  const baseInput = { city, country, candidates, place_index: toPlaceIndex(places) };
  const maxAttempts = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const userPrompt = JSON.stringify(
      attempt === 1
        ? baseInput
        : {
            ...baseInput,
            validation_error: lastError,
            reminder: `Output exactly ${COLLECTIONS_PER_CITY} final collections, each with ${PLACES_PER_COLLECTION_MIN}–${PLACES_PER_COLLECTION_MAX} place_ids. Include grouping_story, dna (0–10 each dimension), and surprise_place_ids (≥1). Use sensory place_reasons. Use empty arrays [] not null for unused improvement fields.`,
          },
      null,
      0
    );

    const raw = await generateGeminiJson(STEP2_3_CRITIQUE_AND_FINALIZE_PROMPT, userPrompt);
    const parsed = critiqueAndFinalizeResponseSchema.safeParse(parseGeminiJson(raw));

    if (!parsed.success) {
      lastError = parsed.error.message;
      if (attempt === maxAttempts) {
        throw new Error(`Steps 2+3 invalid output: ${lastError}\n${raw.slice(0, 500)}`);
      }
      continue;
    }

    try {
      validateCollectionPlaces(parsed.data.collections, validIds, "Final collection");
      return parsed.data;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === maxAttempts) throw err;
    }
  }

  throw new Error(`Steps 2+3 failed after ${maxAttempts} attempts`);
}

function selectedPlaceIds(collections: EditorialCollection[]): string[] {
  return [...new Set(collections.flatMap((c) => c.place_ids))];
}

function buildEnrichmentInput(
  places: CityPlace[],
  collections: EditorialCollection[],
  ids: string[]
) {
  const collectionByPlace = new Map<string, { collection_id: string; title: string; mood: string[] }[]>();

  for (const coll of collections) {
    for (const id of coll.place_ids) {
      if (!collectionByPlace.has(id)) collectionByPlace.set(id, []);
      collectionByPlace.get(id)!.push({
        collection_id: coll.collection_id,
        title: coll.title,
        mood: coll.mood,
      });
    }
  }

  const byId = new Map(places.map((p) => [p.id, p]));

  return ids.map((id) => {
    const place = byId.get(id);
    if (!place) throw new Error(`Selected place ${id} not in city data`);
    return {
      id: place.id,
      place_name: place.place_name,
      description: place.description,
      source_category: place.category || null,
      collection_context: collectionByPlace.get(id) ?? [],
    };
  });
}

async function step4and5and6FinalizePlacesBatch(
  batch: ReturnType<typeof buildEnrichmentInput>
): Promise<{
  places: EnrichedPlace[];
  editorial_notes?: string;
  quality_scores?: z.infer<typeof placeMetadataFinalizeResponseSchema>["quality_scores"];
  critique_summary?: string[];
}> {
  const maxAttempts = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const userPayload =
      attempt === 1
        ? { places: batch }
        : {
            places: batch,
            validation_error: lastError,
            reminder: "assumptions must be a string array [], not a single string.",
          };

    const raw = await generateGeminiJson(
      STEP4_6_DRAFT_CRITIQUE_AND_FINALIZE_PROMPT,
      JSON.stringify(userPayload, null, 0)
    );

    const parsed = placeMetadataFinalizeResponseSchema.safeParse(parseGeminiJson(raw));
    if (!parsed.success) {
      lastError = parsed.error.message;
      if (attempt === maxAttempts) {
        throw new Error(`Steps 4+5+6 invalid output: ${lastError}\n${raw.slice(0, 500)}`);
      }
      continue;
    }

    const byId = new Map(parsed.data.places.map((p) => [p.id, p]));
    const missing = batch.filter((p) => !byId.has(p.id)).map((p) => p.id);
    if (missing.length > 0) {
      lastError = `Missing places: ${missing.join(", ")}`;
      if (attempt === maxAttempts) throw new Error(lastError);
      continue;
    }

    return {
      places: batch.map((p) => byId.get(p.id)!),
      editorial_notes: parsed.data.editorial_notes,
      quality_scores: parsed.data.quality_scores,
      critique_summary: parsed.data.critique_summary,
    };
  }

  throw new Error(`Steps 4+5+6 batch failed after ${maxAttempts} attempts`);
}

async function step4and5and6EnrichSelectedPlaces(
  places: CityPlace[],
  collections: EditorialCollection[],
  ids: string[],
  options?: {
    existingById?: Map<string, EnrichedPlace>;
    onProgressSaved?: (merged: EnrichedPlace[]) => Promise<void>;
  }
): Promise<{
  places: EnrichedPlace[];
  editorial_notes: string[];
  quality_scores: NonNullable<z.infer<typeof placeMetadataFinalizeResponseSchema>["quality_scores"]>[];
  critique_summaries: string[][];
}> {
  const existingById = new Map(options?.existingById ?? []);
  const idsToFetch = ids.filter((id) => !existingById.has(id));
  const input = buildEnrichmentInput(places, collections, idsToFetch);

  const enrichedById = new Map(existingById);
  const editorial_notes: string[] = [];
  const quality_scores: NonNullable<
    z.infer<typeof placeMetadataFinalizeResponseSchema>["quality_scores"]
  >[] = [];
  const critique_summaries: string[][] = [];

  if (idsToFetch.length === 0) {
    return {
      places: ids.map((id) => enrichedById.get(id)!),
      editorial_notes,
      quality_scores,
      critique_summaries,
    };
  }

  for (let i = 0; i < input.length; i += ENRICH_BATCH_SIZE) {
    const batch = input.slice(i, i + ENRICH_BATCH_SIZE);
    console.log(
      `  Steps 4+5+6 batch ${Math.floor(i / ENRICH_BATCH_SIZE) + 1}/${Math.ceil(input.length / ENRICH_BATCH_SIZE)} (${batch.length} places)...`
    );
    const result = await step4and5and6FinalizePlacesBatch(batch);
    for (const place of result.places) enrichedById.set(place.id, place);
    if (result.editorial_notes) editorial_notes.push(result.editorial_notes);
    if (result.quality_scores) quality_scores.push(result.quality_scores);
    if (result.critique_summary) critique_summaries.push(result.critique_summary);

    if (options?.onProgressSaved) {
      await options.onProgressSaved(ids.map((id) => enrichedById.get(id)!));
    }
  }

  return {
    places: ids.map((id) => enrichedById.get(id)!),
    editorial_notes,
    quality_scores,
    critique_summaries,
  };
}

// --- Supabase upload -------------------------------------------------------

async function upsertTag(supabase: ReturnType<typeof createAdminClient>, name: string) {
  const slug = slugify(name);
  const { data: existing } = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("tags")
    .insert({ slug, name, tag_type: "auto" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function getCategoryId(supabase: ReturnType<typeof createAdminClient>, slug: string) {
  const { data } = await supabase.from("categories").select("id").eq("slug", slug).single();
  return data?.id ?? null;
}

async function uploadCollection(params: {
  citySlug: string;
  cityPlaces: CityPlace[];
  enrichedById: Map<string, EnrichedPlace>;
  collection: EditorialCollection;
  userId: string;
}) {
  const { citySlug, cityPlaces, enrichedById, collection, userId } = params;
  const supabase = createAdminClient();
  const placeById = new Map(cityPlaces.map((p) => [p.id, p]));

  const description = [collection.subtitle, collection.editorial_description]
    .filter(Boolean)
    .join("\n\n");

  const { data: coll, error: collError } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      name: collection.title,
      description,
      cover_image_url: getPlaceholderCoverUrl(collection.title),
      cover_source: "placeholder",
      is_public: true,
      source: "city_curated",
      external_id: JSON.stringify({
        collection_id: collection.collection_id,
        subtitle: collection.subtitle,
        why_enjoy: collection.why_enjoy,
        grouping_story: collection.grouping_story,
        target_audience: collection.target_audience,
        mood: collection.mood,
        best_season: collection.best_season,
        estimated_duration: collection.estimated_duration,
        cover_image_prompt: collection.cover_image_prompt,
        visit_order_rationale: collection.visit_order_rationale,
        confidence: collection.confidence,
        dna: collection.dna,
        surprise_place_ids: collection.surprise_place_ids,
        source_city: citySlug,
        place_reasons: collection.place_reasons,
      }),
    })
    .select("id")
    .single();

  if (collError || !coll) {
    throw new Error(collError?.message ?? "Failed to create collection");
  }

  console.log(`\nCreated collection "${collection.title}" (${coll.id})`);

  for (let sortOrder = 0; sortOrder < collection.place_ids.length; sortOrder++) {
    const placeId = collection.place_ids[sortOrder];
    const source = placeById.get(placeId);
    const enriched = enrichedById.get(placeId);

    if (!source || !enriched) {
      throw new Error(`Place ${placeId} not found in city data or enrichment`);
    }

    const googlePlaceId = extractGooglePlaceId(source.google_maps_url);
    let dbPlaceId: string;

    if (googlePlaceId) {
      const { data: existing } = await supabase
        .from("places")
        .select("id")
        .eq("google_place_id", googlePlaceId)
        .maybeSingle();

      if (existing) {
        dbPlaceId = existing.id;
        console.log(`  Reusing place: ${source.place_name}`);
      } else {
        const { data: inserted, error } = await supabase
          .from("places")
          .insert({
            user_id: userId,
            google_place_id: googlePlaceId,
            google_maps_url: source.google_maps_url,
            name: source.place_name,
            address: source.address || null,
            latitude: source.latitude ? Number(source.latitude) : null,
            longitude: source.longitude ? Number(source.longitude) : null,
            import_notes: source.description,
            search_text: buildSearchText([
              source.place_name,
              source.description,
              collection.title,
              enriched.one_sentence_description,
              ...enriched.vibes,
              ...enriched.search_keywords,
            ]),
            enrichment_status: "done",
            search_enriched: true,
            category_id: await getCategoryId(supabase, enriched.category),
            likely_audience: enriched.audience,
            likely_vibe: pickLikelyVibe(enriched.vibes),
            category_confidence: enriched.confidence,
            category_source: "llm",
            metadata: {
              city: source.city,
              country: source.country,
              neighborhood: source.neighborhood,
              knowledge_graph: {
                subcategory: enriched.subcategory,
                ideal_visit_time: enriched.ideal_visit_time,
                visit_duration: enriched.visit_duration,
                estimated_cost: enriched.estimated_cost,
                indoor_outdoor: enriched.indoor_outdoor,
                hidden_gem_score: enriched.hidden_gem_score,
                touristy_score: enriched.touristy_score,
                family_friendly: enriched.family_friendly,
                date_friendly: enriched.date_friendly,
                solo_friendly: enriched.solo_friendly,
                digital_nomad_friendly: enriched.digital_nomad_friendly,
                photography_tags: enriched.photography_tags,
                assumptions: enriched.assumptions,
              },
              collection_reason: collection.place_reasons[placeId],
            },
          })
          .select("id")
          .single();

        if (error || !inserted) throw error;
        dbPlaceId = inserted.id;
        console.log(`  Created place: ${source.place_name}`);
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("places")
        .insert({
          user_id: userId,
          google_maps_url: source.google_maps_url,
          name: source.place_name,
          address: source.address || null,
          latitude: source.latitude ? Number(source.latitude) : null,
          longitude: source.longitude ? Number(source.longitude) : null,
          import_notes: source.description,
          search_text: buildSearchText([
            source.place_name,
            source.description,
            collection.title,
          ]),
          enrichment_status: "done",
          search_enriched: true,
          metadata: { raw: source },
        })
        .select("id")
        .single();

      if (error || !inserted) throw error;
      dbPlaceId = inserted.id;
      console.log(`  Created place (no place_id): ${source.place_name}`);
    }

    const categoryId = await getCategoryId(supabase, enriched.category);
    const tagNames = [
      ...enriched.vibes,
      ...enriched.photography_tags,
      enriched.subcategory,
      enriched.estimated_cost,
      enriched.indoor_outdoor,
      enriched.ideal_visit_time,
    ].filter(Boolean);

    for (const tag of tagNames) {
      const tagId = await upsertTag(supabase, tag);
      await supabase.from("place_tags").upsert(
        {
          place_id: dbPlaceId,
          tag_id: tagId,
          source: "llm",
          confidence: enriched.confidence,
        },
        { onConflict: "place_id,tag_id" }
      );
    }

    await supabase
      .from("places")
      .update({
        category_id: categoryId,
        likely_audience: enriched.audience,
        likely_vibe: pickLikelyVibe(enriched.vibes),
        category_confidence: enriched.confidence,
        category_source: "llm",
        search_enriched: true,
        enrichment_status: "done",
        search_text: buildSearchText([
          source.place_name,
          source.description,
          collection.title,
          enriched.one_sentence_description,
          ...enriched.vibes,
          ...enriched.search_keywords,
        ]),
        updated_at: new Date().toISOString(),
      })
      .eq("id", dbPlaceId);

    await supabase.from("place_descriptions").upsert(
      {
        place_id: dbPlaceId,
        short_text: enriched.one_sentence_description,
        long_text: enriched.one_sentence_description,
        interesting_facts: [],
        source: "llm_city_curated",
        model: GEMINI_MODEL,
        prompt_version: PROMPT_VERSION,
      },
      { onConflict: "place_id" }
    );

    await supabase.from("collection_places").upsert(
      { collection_id: coll.id, place_id: dbPlaceId, sort_order: sortOrder },
      { onConflict: "collection_id,place_id" }
    );
  }

  return coll.id;
}

// --- main ------------------------------------------------------------------

async function main() {
  await loadEnvFile();
  const opts = parseArgs(process.argv.slice(2));

  console.log(`City: ${opts.citySlug}`);
  console.log(`Model: ${GEMINI_MODEL}`);
  console.log(`Target: ${COLLECTIONS_PER_CITY} collections, ${PLACES_PER_COLLECTION_MIN}–${PLACES_PER_COLLECTION_MAX} places each`);

  const cityPlaces = await readCityCsv(opts.citySlug, opts.limit);
  const city = cityPlaces[0]?.city ?? opts.citySlug;
  const country = cityPlaces[0]?.country ?? "";

  console.log(`Loaded ${cityPlaces.length} places from CSV`);

  const aiInputPreview = toPlaceRecords(cityPlaces);
  console.log(`AI input preview (first record): ${JSON.stringify(aiInputPreview[0])}`);

  if (opts.dryRun) {
    console.log("\n--dry-run: stopping before Gemini calls");
    return;
  }

  const paths = artifactPaths(opts.citySlug);
  await mkdir(paths.outDir, { recursive: true });

  const validIds = new Set(cityPlaces.map((p) => p.id));
  let manifest =
    (await readJsonFile<PipelineManifest>(paths.manifest)) ??
    baseManifest(opts.citySlug, cityPlaces.length, opts.limit);

  const useCache =
    !opts.force && cacheMatchesInput(manifest, opts.citySlug, cityPlaces.length, opts.limit);

  if (opts.force) {
    console.log("\n--force: ignoring cached pipeline steps");
    manifest = baseManifest(opts.citySlug, cityPlaces.length, opts.limit);
  } else if (!useCache) {
    console.log("\nCache miss (city, place count, or --limit changed) — running fresh pipeline");
    manifest = baseManifest(opts.citySlug, cityPlaces.length, opts.limit);
  }

  let step1: { candidates: CandidateCollection[]; generation_notes?: string };
  if (useCache && stepCompleted(manifest, "1")) {
    const cached = await loadCachedStep1(paths, validIds);
    if (cached) {
      console.log("\nCall 1 — Step 1: (cached) candidates.json");
      step1 = cached;
    } else {
      console.log("\nCall 1 — Step 1: cache invalid, regenerating...");
      step1 = await step1GenerateCandidates(city, country, cityPlaces);
      await saveStep1Artifact(paths, opts.citySlug, step1, manifest);
    }
  } else {
    console.log("\nCall 1 — Step 1: Generating candidate collections...");
    step1 = await step1GenerateCandidates(city, country, cityPlaces);
    await saveStep1Artifact(paths, opts.citySlug, step1, manifest);
  }
  console.log(`  ${step1.candidates.length} candidates`);

  let step23: {
    critiques: CollectionCritique[];
    global_issues?: string[];
    collections: EditorialCollection[];
    rejected_candidate_ids: string[];
    editorial_notes?: string;
    critique_summary?: string[];
  };
  if (useCache && stepCompleted(manifest, "2+3")) {
    const cached = await loadCachedStep23(paths, validIds);
    if (cached) {
      console.log("\nCall 2 — Steps 2+3: (cached) collection-critiques.json + collections.json");
      step23 = cached;
    } else {
      console.log("\nCall 2 — Steps 2+3: cache invalid, regenerating...");
      step23 = await step2and3CritiqueAndFinalize(city, country, step1.candidates, cityPlaces);
      await saveStep23Artifacts(paths, opts.citySlug, step23, manifest);
    }
  } else {
    console.log("\nCall 2 — Steps 2+3: Critiquing and finalizing collections...");
    step23 = await step2and3CritiqueAndFinalize(city, country, step1.candidates, cityPlaces);
    await saveStep23Artifacts(paths, opts.citySlug, step23, manifest);
  }

  const collections = step23.collections;
  console.log(`  ${step23.critiques.length} critiques, ${collections.length} final collections`);

  const ids = selectedPlaceIds(collections);
  console.log(`\n${ids.length} unique places selected for metadata pipeline`);

  let step456: {
    places: EnrichedPlace[];
    editorial_notes: string[];
    quality_scores: NonNullable<
      z.infer<typeof placeMetadataFinalizeResponseSchema>["quality_scores"]
    >[];
    critique_summaries: string[][];
  };

  const partialEnriched = await readJsonFile<{ places: EnrichedPlace[] }>(paths.enriched);
  const existingById = new Map(
    (useCache ? partialEnriched?.places ?? [] : []).map((p) => [p.id, p])
  );
  const missingIds = ids.filter((id) => !existingById.has(id));

  if (useCache && stepCompleted(manifest, "4+5+6") && missingIds.length === 0) {
    const cached = await loadCachedEnrichedPlaces(paths, ids);
    if (cached) {
      console.log("\nCall 3 — Steps 4+5+6: (cached) enriched-places.json");
      step456 = cached;
    } else {
      console.log("\nCall 3 — Steps 4+5+6: cache invalid, regenerating...");
      step456 = await step4and5and6EnrichSelectedPlaces(cityPlaces, collections, ids, {
        onProgressSaved: async (merged) => {
          await saveStep456Artifact(
            paths,
            opts.citySlug,
            { places: merged, editorial_notes: [], quality_scores: [], critique_summaries: [] },
            manifest
          );
        },
      });
      await saveStep456Artifact(paths, opts.citySlug, step456, manifest);
    }
  } else if (missingIds.length < ids.length && missingIds.length > 0) {
    console.log(
      `\nCall 3 — Steps 4+5+6: resuming (${existingById.size} cached, ${missingIds.length} remaining)...`
    );
    step456 = await step4and5and6EnrichSelectedPlaces(cityPlaces, collections, ids, {
      existingById,
      onProgressSaved: async (merged) => {
        await writeFile(
          paths.enriched,
          JSON.stringify(
            { city: opts.citySlug, model: GEMINI_MODEL, place_count: merged.length, places: merged, partial: true },
            null,
            2
          )
        );
      },
    });
    await saveStep456Artifact(paths, opts.citySlug, step456, manifest);
  } else {
    console.log("\nCall 3 — Steps 4+5+6: Drafting, critiquing, and finalizing place metadata...");
    step456 = await step4and5and6EnrichSelectedPlaces(cityPlaces, collections, ids, {
      onProgressSaved: async (merged) => {
        await writeFile(
          paths.enriched,
          JSON.stringify(
            { city: opts.citySlug, model: GEMINI_MODEL, place_count: merged.length, places: merged, partial: true },
            null,
            2
          )
        );
      },
    });
    await saveStep456Artifact(paths, opts.citySlug, step456, manifest);
  }

  const enrichedPlaces = step456.places;
  const enrichedById = new Map(enrichedPlaces.map((p) => [p.id, p]));

  await writeManifest(paths, manifest);

  console.log(`\nArtifacts in ${paths.outDir}`);
  console.log(`  ${paths.candidates}`);
  console.log(`  ${paths.critiques}`);
  console.log(`  ${paths.collections}`);
  console.log(`  ${paths.enriched}`);
  console.log(`  ${paths.manifest}`);

  console.log("\nCollections:");
  collections.forEach((c, i) => {
    console.log(`  [${i}] ${c.title} — ${c.place_ids.length} places — ${c.subtitle}`);
  });

  if (opts.upload) {
    if (!opts.userId) {
      console.error("\n--upload requires --user-id <profile-uuid> or CURATED_USER_ID env");
      process.exit(1);
    }

    const toUpload =
      opts.collectionIndex != null
        ? [{ index: opts.collectionIndex, collection: collections[opts.collectionIndex] }]
        : collections.map((collection, index) => ({ index, collection }));

    if (toUpload.some((item) => !item.collection)) {
      console.error("\nInvalid --collection index");
      process.exit(1);
    }

    const uploaded: string[] = [];
    for (const { index, collection } of toUpload) {
      console.log(`\nUploading collection [${index}] "${collection.title}"...`);
      const collectionId = await uploadCollection({
        citySlug: opts.citySlug,
        cityPlaces,
        enrichedById,
        collection,
        userId: opts.userId,
      });
      uploaded.push(collectionId);
    }

    console.log(`\nDone. Uploaded ${uploaded.length} collection(s): ${uploaded.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
