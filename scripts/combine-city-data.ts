#!/usr/bin/env node
/**
 * Combine raw scraped CSVs into one file per city.
 *
 * Input:  data/raw/{source}/…csv  (mapita, culturetrip, timeout, corner, atlasobscura, …)
 * Output: data/cities/{city-slug}.csv
 *
 * Each row keeps its source metadata so an LLM can merge overlapping places
 * across sources in a later step. Rows are only deduped when they are exact
 * duplicates (same place + source + guide).
 *
 * Usage: npm run combine-city-data
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const RAW_DIR = path.join(ROOT, "data", "raw");
const CITIES_DIR = path.join(ROOT, "data", "cities");

const OUTPUT_COLUMNS = [
  "city",
  "country",
  "continent",
  "region",
  "neighborhood",
  "place_name",
  "rank",
  "category",
  "description",
  "what_is_it",
  "why_we_love_it",
  "time_out_tip",
  "user_tips",
  "address",
  "opening_hours",
  "price_notes",
  "saves_count",
  "google_maps_url",
  "latitude",
  "longitude",
  "source_name",
  "source_url",
  "source_collection",
  "guide_intro",
  "published_date",
  "tags",
  "raw_section",
] as const;

type OutputRow = Record<(typeof OUTPUT_COLUMNS)[number], string>;

const COUNTRY_ALIASES: Record<string, string> = {
  uk: "United Kingdom",
  usa: "United States",
  us: "United States",
};

const AGGREGATE_FILE_PREFIXES = ["mapita-places-", "mapita-cities-", "mapita-guides-"];

async function findCsvFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      throw err;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".csv")) results.push(full);
    }
  }

  await walk(dir);
  return results.filter(shouldIncludeFile).sort();
}

/** Skip cross-city aggregate exports that duplicate per-city files. */
function shouldIncludeFile(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  if (base.includes("-places-")) return false;
  if (AGGREGATE_FILE_PREFIXES.some((prefix) => base.startsWith(prefix))) return false;
  return true;
}

function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (word === word.toUpperCase() && word.length <= 3) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function normalizeCountry(country: string): string {
  const trimmed = country.trim();
  if (!trimmed) return "";
  const alias = COUNTRY_ALIASES[trimmed.toLowerCase()];
  return alias ?? titleCaseWords(trimmed);
}

function normalizeCity(city: string): string {
  const trimmed = city.trim();
  if (!trimmed) return "";
  return titleCaseWords(trimmed);
}

function inferSourceName(filePath: string): string {
  const rel = path.relative(RAW_DIR, filePath);
  const parts = rel.split(path.sep).filter(Boolean);

  if (parts.length > 1) return parts[0].toLowerCase();

  const base = path.basename(filePath, ".csv").toLowerCase();
  const known = base.match(/^(mapita|culturetrip|atlasobscura|timeout|corner)/);
  if (known) return known[1];

  return base.split("-")[0] || "unknown";
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key]?.trim();
    if (value) return value;
  }
  return "";
}

function normalizeRow(row: Record<string, string>, filePath: string): OutputRow | null {
  const place_name = pick(row, "place_name", "placeName", "Title", "name");
  const city = normalizeCity(pick(row, "city", "City"));
  if (!place_name || !city) return null;

  const source_name = pick(row, "source_name") || inferSourceName(filePath);
  const source_url = pick(row, "source_url", "guide_url");
  const source_collection = pick(row, "source_collection", "guide_name", "collection_name");

  return {
    city,
    country: normalizeCountry(pick(row, "country", "Country")),
    continent: pick(row, "continent"),
    region: pick(row, "region"),
    neighborhood: pick(row, "neighborhood"),
    place_name,
    rank: pick(row, "rank"),
    category: pick(row, "category"),
    description: pick(row, "description", "Note", "notes"),
    what_is_it: pick(row, "what_is_it"),
    why_we_love_it: pick(row, "why_we_love_it"),
    time_out_tip: pick(row, "time_out_tip"),
    user_tips: pick(row, "user_tips"),
    address: pick(row, "address", "Address"),
    opening_hours: pick(row, "opening_hours", "opening hours", "Opening hours"),
    price_notes: pick(row, "price_notes", "expect_to_pay"),
    saves_count: pick(row, "saves_count"),
    google_maps_url: pick(row, "google_maps_url", "venue_url", "URL"),
    latitude: pick(row, "latitude", "lat"),
    longitude: pick(row, "longitude", "lng", "lon"),
    source_name,
    source_url,
    source_collection,
    guide_intro: pick(row, "guide_intro"),
    published_date: pick(row, "published_date"),
    tags: pick(row, "tags"),
    raw_section: pick(row, "raw_section"),
  };
}

function rowDedupeKey(row: OutputRow): string {
  const guideKey = row.source_url.toLowerCase().trim() || row.source_collection.toLowerCase().trim();
  return [row.place_name, row.source_name, guideKey].map((value) => value.trim()).join("|");
}

function rowRichness(row: OutputRow): number {
  let score = 0;
  if (row.description) score += row.description.length;
  if (row.raw_section) score += row.raw_section.length;
  if (row.address) score += 200;
  if (row.opening_hours) score += 50;
  if (row.google_maps_url) score += 50;
  if (row.latitude && row.longitude) score += 25;
  if (row.user_tips) score += row.user_tips.length;
  if (row.what_is_it) score += row.what_is_it.length;
  return score;
}

function mergeRows(primary: OutputRow, secondary: OutputRow): OutputRow {
  const merged = { ...primary };
  for (const col of OUTPUT_COLUMNS) {
    if (!merged[col] && secondary[col]) merged[col] = secondary[col];
    if (
      (col === "description" || col === "raw_section") &&
      secondary[col].length > merged[col].length
    ) {
      merged[col] = secondary[col];
    }
  }
  return merged;
}

/** Drop re-scrapes of the same guide; merge fields and keep all cross-source rows. */
function dedupeExactRows(rows: OutputRow[]): OutputRow[] {
  const byKey = new Map<string, OutputRow>();

  for (const row of rows) {
    const key = rowDedupeKey(row);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }

    const [richer, poorer] =
      rowRichness(row) >= rowRichness(existing) ? [row, existing] : [existing, row];
    byKey.set(key, mergeRows(richer, poorer));
  }

  return [...byKey.values()];
}

function sortRows(rows: OutputRow[]): OutputRow[] {
  return [...rows].sort((a, b) => {
    const bySource = a.source_name.localeCompare(b.source_name);
    if (bySource !== 0) return bySource;
    const byCollection = a.source_collection.localeCompare(b.source_collection);
    if (byCollection !== 0) return byCollection;
    return a.place_name.localeCompare(b.place_name);
  });
}

function toCsv(rows: OutputRow[]): string {
  const header = OUTPUT_COLUMNS.join(",");
  const lines = rows.map((row) =>
    OUTPUT_COLUMNS.map((col) => csvEscape(row[col])).join(",")
  );
  return [header, ...lines].join("\n") + "\n";
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function main() {
  const allFiles = await findCsvFiles(RAW_DIR);
  if (allFiles.length === 0) {
    console.error(`No CSV files found in ${RAW_DIR}`);
    console.error("Add scraper output under data/raw/ (e.g. data/raw/mapita/lyon.csv)");
    process.exit(1);
  }

  const byCity = new Map<string, OutputRow[]>();
  const sourceCounts = new Map<string, number>();
  let totalRows = 0;
  let skippedRows = 0;

  for (const file of allFiles) {
    const content = await readFile(file, "utf8");
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0) {
      const first = parsed.errors[0];
      throw new Error(`${file}: CSV parse error at row ${first.row}: ${first.message}`);
    }

    let fileRows = 0;
    for (const row of parsed.data) {
      const normalized = normalizeRow(row, file);
      if (!normalized) {
        skippedRows++;
        continue;
      }

      const cityKey = slugifyCity(normalized.city);
      if (!byCity.has(cityKey)) byCity.set(cityKey, []);
      byCity.get(cityKey)!.push(normalized);
      totalRows++;
      fileRows++;
    }

    if (fileRows > 0) {
      const rel = path.relative(RAW_DIR, file);
      console.log(`  ${rel} — ${fileRows} rows`);
    }
  }

  await mkdir(CITIES_DIR, { recursive: true });

  const citySlugs = [...byCity.keys()].sort();
  let writtenPlaces = 0;

  console.log("");
  for (const citySlug of citySlugs) {
    const rows = sortRows(dedupeExactRows(byCity.get(citySlug)!));
    const outPath = path.join(CITIES_DIR, `${citySlug}.csv`);
    await writeFile(outPath, toCsv(rows), "utf8");
    writtenPlaces += rows.length;

    const sources = [...new Set(rows.map((row) => row.source_name))].sort();
    for (const source of sources) {
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    }

    console.log(`${citySlug}.csv — ${rows.length} places [${sources.join(", ")}]`);
  }

  const sourceSummary = [...sourceCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, cities]) => `${source}: ${cities} cities`)
    .join(", ");

  console.log(
    `\nDone: ${writtenPlaces} places across ${citySlugs.length} cities` +
      ` (from ${allFiles.length} files, ${totalRows} raw rows, ${skippedRows} skipped)` +
      `\nSources: ${sourceSummary}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
