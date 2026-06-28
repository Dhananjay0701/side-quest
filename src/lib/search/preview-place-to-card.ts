import type { PlaceCard } from "@/lib/db/types";
import type { ExternalPlaceSuggestion, LocalPlaceHit } from "@/lib/search/types";
import { resolveAssetUrl } from "@/lib/images/assets";

type PreviewPlace = LocalPlaceHit | ExternalPlaceSuggestion;

export function previewPlaceToCard(
  place: PreviewPlace,
  placeId: string,
  collectionName: string
): PlaceCard {
  const cover =
    "coverImageUrl" in place && place.coverImageUrl
      ? resolveAssetUrl(place.coverImageUrl)
      : null;

  return {
    id: placeId,
    name: place.name,
    category: null,
    tags: [],
    address: place.address,
    rating: null,
    coverImageUrl: cover,
    shortDescription: null,
    googleMapsUrl: "googleMapsUrl" in place ? place.googleMapsUrl : null,
    likelyAudience: null,
    likelyVibe: null,
    collectionName,
    latitude: place.latitude,
    longitude: place.longitude,
    visitStatus: "saved",
  };
}
