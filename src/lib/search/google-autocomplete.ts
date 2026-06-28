import { profileExternal } from "@/lib/debug/profiler";
import { isGooglePlacesConfigured } from "@/lib/places/google-places";
import type { ExternalPlaceSuggestion } from "@/lib/search/types";
import { buildCacheKey, getCachedAutocomplete, setCachedAutocomplete } from "@/lib/search/search-cache";
import { recordSearchUsage } from "@/lib/search/usage";

const PLACES_BASE = "https://places.googleapis.com/v1";

function getApiKey(): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

function normalizePlaceResourceId(id: string): string {
  return id.startsWith("places/") ? id.slice("places/".length) : id;
}

export async function searchGoogleAutocomplete(
  q: string,
  options?: {
    lat?: number;
    lng?: number;
    sessionToken?: string;
    limit?: number;
  }
): Promise<ExternalPlaceSuggestion[]> {
  if (!isGooglePlacesConfigured()) return [];

  const limit = options?.limit ?? 8;
  const cacheKey = buildCacheKey(
    `google:${options?.sessionToken ?? "anon"}`,
    q,
    options?.lat,
    options?.lng
  );
  const cached = await getCachedAutocomplete<ExternalPlaceSuggestion[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  return profileExternal("search.google", async () => {
    const key = getApiKey();
    if (!key) return [];

    const body: Record<string, unknown> = {
      input: q,
      includedPrimaryTypes: ["establishment", "point_of_interest", "geocode"],
    };

    if (options?.sessionToken) {
      body.sessionToken = options.sessionToken;
    }

    if (options?.lat != null && options?.lng != null) {
      body.locationBias = {
        circle: {
          center: { latitude: options.lat, longitude: options.lng },
          radius: 50_000,
        },
      };
    }

    const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];

    recordSearchUsage("google", "autocomplete");

    const json = (await res.json()) as {
      suggestions?: {
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
          types?: string[];
        };
      }[];
    };

    const results: ExternalPlaceSuggestion[] = [];

    for (const suggestion of json.suggestions ?? []) {
      const pred = suggestion.placePrediction;
      if (!pred?.placeId) continue;

      const name =
        pred.structuredFormat?.mainText?.text ?? pred.text?.text ?? pred.placeId;
      const address = pred.structuredFormat?.secondaryText?.text ?? null;
      const placesApiId = normalizePlaceResourceId(pred.placeId);

      results.push({
        kind: "external",
        source: "google",
        externalId: placesApiId,
        name,
        address,
        latitude: null,
        longitude: null,
        category: pred.types?.[0] ?? null,
        googlePlaceId: placesApiId,
        placesApiId,
      });

      if (results.length >= limit) break;
    }

    if (results.length > 0) {
      await setCachedAutocomplete(cacheKey, "google", results);
    }

    return results;
  });
}
