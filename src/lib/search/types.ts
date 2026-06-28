export type PlaceTier = "light" | "full";
export type PlaceSource = "import" | "osm" | "google" | "manual";
export type PhotoStatus = "none" | "pending" | "ready" | "failed";
export type SearchResultGroup = "places" | "collections" | "cities" | "external";

export interface LocalPlaceHit {
  kind: "place";
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
  placeTier: PlaceTier;
  source: PlaceSource;
  googleMapsUrl: string | null;
  /** Collections the viewer owns that contain this place */
  inCollections?: { id: string; name: string }[];
}

export interface CollectionSearchHit {
  kind: "collection";
  id: string;
  name: string;
  description: string | null;
  placeCount: number;
  coverImageUrl: string | null;
  isPublic: boolean;
  isOwned?: boolean;
}

export interface CitySearchHit {
  kind: "city";
  id: string;
  name: string;
  href: string;
  imageUrl: string | null;
}

/** Google Autocomplete suggestion — no Place Details until enrichment */
export interface ExternalPlaceSuggestion {
  kind: "external";
  source: "google";
  externalId: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  googlePlaceId: string | null;
  placesApiId: string | null;
}

export type SearchSuggestItem =
  | LocalPlaceHit
  | CollectionSearchHit
  | CitySearchHit
  | ExternalPlaceSuggestion;

export interface GroupedSearchResults {
  places: LocalPlaceHit[];
  collections: CollectionSearchHit[];
  cities: CitySearchHit[];
  external: ExternalPlaceSuggestion[];
  providersUsed: ("local" | "google")[];
}

export interface LightPlaceInput {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  placesApiId?: string | null;
  source: "google" | "import" | "manual";
  category?: string | null;
}

export interface CreatePlacePayload {
  placeId?: string;
  external?: LightPlaceInput;
  collectionId: string;
}

export interface CreatePlaceResult {
  placeId: string;
  tier: PlaceTier;
  enrichmentQueued: boolean;
  created: boolean;
}
