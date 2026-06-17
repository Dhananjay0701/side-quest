import Papa from "papaparse";
import type { NormalizedCollection, NormalizedPlace } from "@/lib/db/types";
import { extractGooglePlaceId, normalizeGoogleMapsUrl } from "@/lib/utils/google-maps";

interface CsvRow {
  Title?: string;
  Note?: string;
  URL?: string;
  Tags?: string;
  Comment?: string;
}

function parseImportTags(tags?: string): string[] {
  if (!tags?.trim()) return [];
  return tags
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function rowToPlace(row: CsvRow): NormalizedPlace | null {
  const name = row.Title?.trim();
  const url = row.URL?.trim();

  if (!name || !url) return null;

  const notes = [row.Note, row.Comment].filter(Boolean).join(" ").trim() || null;

  return {
    name,
    googleMapsUrl: normalizeGoogleMapsUrl(url),
    googlePlaceId: extractGooglePlaceId(url),
    notes,
    importTags: parseImportTags(row.Tags),
    raw: {
      Title: row.Title ?? "",
      Note: row.Note ?? "",
      URL: row.URL ?? "",
      Tags: row.Tags ?? "",
      Comment: row.Comment ?? "",
    },
  };
}

export function parseGoogleMapsCsv(
  csvContent: string,
  collectionName: string,
  collectionDescription?: string
): NormalizedCollection {
  const parsed = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error at row ${first.row}: ${first.message}`);
  }

  const places: NormalizedPlace[] = [];

  for (const row of parsed.data) {
    const place = rowToPlace(row);
    if (place) places.push(place);
  }

  if (places.length === 0) {
    throw new Error("No valid places found in CSV. Ensure Title and URL columns are populated.");
  }

  return {
    name: collectionName,
    description: collectionDescription ?? null,
    places,
  };
}

export function collectionNameFromFilename(filename: string): string {
  return filename
    .replace(/\.(csv|json)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
