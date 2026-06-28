import type { LightPlaceInput } from "@/lib/search/types";

export function buildSyntheticMapsUrl(place: {
  osmId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  placesApiId?: string | null;
  name?: string;
}): string {
  if (place.placesApiId || place.googlePlaceId) {
    const id = place.placesApiId ?? place.googlePlaceId;
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id!)}`;
  }

  if (place.osmId) {
    const numeric = place.osmId.replace(/^[NWRC]/, "");
    const type = place.osmId.charAt(0);
    const path =
      type === "W"
        ? `way/${numeric}`
        : type === "R"
          ? `relation/${numeric}`
          : `node/${numeric}`;
    return `https://www.openstreetmap.org/${path}`;
  }

  if (place.latitude != null && place.longitude != null) {
    return `https://maps.google.com/?q=${place.latitude},${place.longitude}`;
  }

  if (place.name) {
    return `https://maps.google.com/?q=${encodeURIComponent(place.name)}`;
  }

  return "https://maps.google.com/";
}

export function buildSearchText(name: string, address?: string | null): string {
  return [name, address].filter(Boolean).join(" ");
}

export function lightPlaceFromInput(input: LightPlaceInput) {
  const placesApiId = input.placesApiId ?? input.googlePlaceId ?? null;
  return {
    name: input.name,
    address: input.address ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    google_place_id: placesApiId,
    places_api_id: placesApiId,
    place_source: input.source,
    google_maps_url: buildSyntheticMapsUrl({ ...input, placesApiId }),
    search_text: buildSearchText(input.name, input.address),
  };
}
