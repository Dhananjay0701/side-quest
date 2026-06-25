#!/usr/bin/env node
/**
 * Combine raw scraped CSVs into one file per city.
 *
 * Input:  data/raw/ (all CSV files, recursively)
 * Output: data/cities/{city-slug}.csv
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
  "place_name",
  "description",
  "address",
  "opening_hours",
  "google_maps_url",
  "latitude",
  "longitude",
  "source_name",
  "source_url",
  "source_collection",
] as const;

type OutputRow = Record<(typeof OUTPUT_COLUMNS)[number], string>;

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
  return results.sort();
}

function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferSourceName(filePath: string): string {
  const rel = path.relative(RAW_DIR, filePath);
  const parts = rel.split(path.sep).filter(Boolean);

  if (parts.length > 1) return parts[0].toLowerCase();

  const base = path.basename(filePath, ".csv").toLowerCase();
  const known = base.match(/^(mapita|culturetrip|atlasobscura)/);
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
  const city = pick(row, "city", "City");
  if (!place_name || !city) return null;

  return {
    city,
    country: pick(row, "country", "Country"),
    place_name,
    description: pick(row, "description", "Note", "notes"),
    address: pick(row, "address", "Address"),
    opening_hours: pick(row, "opening_hours", "opening hours", "Opening hours"),
    google_maps_url: pick(row, "google_maps_url", "URL", "url"),
    latitude: pick(row, "latitude", "lat"),
    longitude: pick(row, "longitude", "lng", "lon"),
    source_name: pick(row, "source_name") || inferSourceName(filePath),
    source_url: pick(row, "source_url", "guide_url", "url"),
    source_collection: pick(row, "source_collection", "guide_name", "collection_name"),
  };
}

function rowScore(row: OutputRow): number {
  let score = 0;
  if (row.description) score += row.description.length;
  if (row.address) score += 200;
  if (row.opening_hours) score += 50;
  if (row.google_maps_url) score += 50;
  if (row.latitude && row.longitude) score += 25;
  if (row.source_url) score += 10;
  if (row.source_collection) score += 5;
  return score;
}

function dedupePlaces(rows: OutputRow[]): OutputRow[] {
  const byName = new Map<string, OutputRow>();

  for (const row of rows) {
    const key = row.place_name;
    const existing = byName.get(key);
    if (!existing || rowScore(row) > rowScore(existing)) {
      byName.set(key, row);
    }
  }

  return [...byName.values()];
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
  const files = await findCsvFiles(RAW_DIR);
  if (files.length === 0) {
    console.error(`No CSV files found in ${RAW_DIR}`);
    console.error("Add scraper output under data/raw/ (e.g. data/raw/mapita/lyon.csv)");
    process.exit(1);
  }

  const byCity = new Map<string, OutputRow[]>();
  let totalRows = 0;
  let skippedRows = 0;

  for (const file of files) {
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
    }
  }

  await mkdir(CITIES_DIR, { recursive: true });

  const citySlugs = [...byCity.keys()].sort();
  let writtenPlaces = 0;

  for (const citySlug of citySlugs) {
    const rows = dedupePlaces(byCity.get(citySlug)!);
    rows.sort((a, b) => a.place_name.localeCompare(b.place_name));
    const outPath = path.join(CITIES_DIR, `${citySlug}.csv`);
    await writeFile(outPath, toCsv(rows), "utf8");
    writtenPlaces += rows.length;
    console.log(`${citySlug}.csv — ${rows.length} places`);
  }

  console.log(
    `\nDone: ${writtenPlaces} places across ${citySlugs.length} cities` +
      ` (from ${files.length} files, ${totalRows} raw rows, ${skippedRows} skipped)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
