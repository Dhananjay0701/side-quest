import { getSearchConfig } from "@/lib/search/config";
import type { GroupedSearchResults } from "@/lib/search/types";
import { searchGoogleAutocomplete } from "@/lib/search/google-autocomplete";
import {
  searchCities,
  searchLocalCollections,
  searchLocalPlaces,
  searchPlacesWithUserCollections,
  searchUserOwnedCollections,
} from "@/lib/search/local-search";
import { recordSearchUsage } from "@/lib/search/usage";

export interface SearchPipelineOptions {
  q: string;
  lat?: number;
  lng?: number;
  sessionToken?: string;
  viewerProfileId?: string | null;
  limit?: number;
  /** Hero bar: always show discover places, user-owned collections only */
  heroMode?: boolean;
}

export async function runSearchPipeline(
  options: SearchPipelineOptions
): Promise<GroupedSearchResults> {
  const { q, lat, lng, sessionToken, viewerProfileId, heroMode } = options;
  const limit = options.limit ?? 8;
  const config = getSearchConfig();
  const providersUsed: GroupedSearchResults["providersUsed"] = ["local"];
  recordSearchUsage("local", "suggest");

  const discoverLimit = heroMode ? 3 : limit;

  const [places, collections, cities] = await Promise.all([
    heroMode && viewerProfileId
      ? searchPlacesWithUserCollections(q, viewerProfileId, limit)
      : searchLocalPlaces(q, limit),
    heroMode && viewerProfileId
      ? searchUserOwnedCollections(q, viewerProfileId, 6)
      : searchLocalCollections(q, viewerProfileId, 6),
    heroMode ? Promise.resolve([]) : searchCities(q, 5),
  ]);

  let external: GroupedSearchResults["external"] = [];

  const localPlaceHitsSufficient = places.length >= config.localMinHits;
  const shouldFetchGoogle = heroMode || !localPlaceHitsSufficient;

  if (shouldFetchGoogle && config.googleAutocompleteEnabled) {
    const googleResults = await searchGoogleAutocomplete(q, {
      lat,
      lng,
      sessionToken,
      limit: discoverLimit,
    });
    if (googleResults.length > 0) {
      providersUsed.push("google");
      external = googleResults.slice(0, discoverLimit);
    }
  } else {
    recordSearchUsage("search", "suggest_no_google");
  }

  return {
    places,
    collections,
    cities,
    external,
    providersUsed,
  };
}
