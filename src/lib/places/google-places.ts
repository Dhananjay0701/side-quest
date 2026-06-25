import { extractPlaceNameFromUrl } from "@/lib/utils/google-maps";
import { profileExternal } from "@/lib/debug/profiler";

const PLACES_BASE = "https://places.googleapis.com/v1";

export interface GooglePlacePhotoMeta {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: { displayName?: string; uri?: string }[];
}

export interface GooglePlaceLookupResult {
  placesApiId: string;
  displayName: string;
  photos: GooglePlacePhotoMeta[];
  formattedAddress?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

function getApiKey(): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

function normalizePlaceResourceId(id: string): string {
  return id.startsWith("places/") ? id.slice("places/".length) : id;
}

function placesHeaders(fieldMask: string): HeadersInit {
  const key = getApiKey();
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": key,
    "X-Goog-FieldMask": fieldMask,
  };
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(getApiKey());
}

export async function textSearchPlace(textQuery: string): Promise<GooglePlaceLookupResult | null> {
  return profileExternal("Google Places Text Search", async () => {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: placesHeaders(
      "places.id,places.displayName,places.photos,places.formattedAddress,places.rating,places.location"
    ),
    body: JSON.stringify({ textQuery, maxResultCount: 1 }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places text search failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as {
    places?: {
      id?: string;
      displayName?: { text?: string };
      photos?: GooglePlacePhotoMeta[];
      formattedAddress?: string;
      rating?: number;
      location?: { latitude?: number; longitude?: number };
    }[];
  };

  const place = json.places?.[0];
  if (!place?.id) return null;

  return {
    placesApiId: place.id,
    displayName: place.displayName?.text ?? textQuery,
    photos: place.photos ?? [],
    formattedAddress: place.formattedAddress,
    rating: place.rating,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
  };
  });
}

export async function getPlaceDetails(placesApiId: string): Promise<GooglePlaceLookupResult | null> {
  return profileExternal("Google Places Details", async () => {
  const resourceId = normalizePlaceResourceId(placesApiId);
  const res = await fetch(`${PLACES_BASE}/places/${resourceId}`, {
    headers: placesHeaders(
      "id,displayName,photos,formattedAddress,rating,location"
    ),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const body = await res.text();
    throw new Error(`Places details failed (${res.status}): ${body}`);
  }

  const place = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    photos?: GooglePlacePhotoMeta[];
    formattedAddress?: string;
    rating?: number;
    location?: { latitude?: number; longitude?: number };
  };

  if (!place.id) return null;

  return {
    placesApiId: place.id,
    displayName: place.displayName?.text ?? "",
    photos: place.photos ?? [],
    formattedAddress: place.formattedAddress,
    rating: place.rating,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
  };
  });
}

export function buildPlaceTextQuery(params: {
  name: string;
  googleMapsUrl: string;
  importNotes?: string | null;
  collectionName?: string | null;
}): string {
  const urlName = extractPlaceNameFromUrl(params.googleMapsUrl);
  const parts = [params.name, urlName, params.collectionName, params.importNotes]
    .filter(Boolean)
    .map((p) => p!.trim());

  return [...new Set(parts)].join(" ");
}

export async function resolvePlaceForPhotos(params: {
  name: string;
  googleMapsUrl: string;
  importNotes?: string | null;
  collectionName?: string | null;
  placesApiId?: string | null;
}): Promise<GooglePlaceLookupResult | null> {
  if (params.placesApiId) {
    const details = await getPlaceDetails(params.placesApiId);
    if (details) return details;
  }

  const textQuery = buildPlaceTextQuery(params);
  if (!textQuery.trim()) return null;

  return textSearchPlace(textQuery);
}

/** Fetches only the first photo bytes via Place Photos (New) — one billable image request. */
export async function fetchFirstPlacePhotoBytes(
  photoName: string,
  maxPx = 800
): Promise<{ buffer: Buffer; contentType: string }> {
  return profileExternal("Google Places Photo", async () => {
  const key = getApiKey();
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

  const url = `${PLACES_BASE}/${photoName}/media?maxHeightPx=${maxPx}&maxWidthPx=${maxPx}&key=${key}`;
  const res = await fetch(url, { redirect: "follow" });

  if (!res.ok) {
    throw new Error(`Place photo fetch failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
  });
}
