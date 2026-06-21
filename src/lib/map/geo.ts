import { getMarkerIconId } from "@/lib/map/category-markers";
import type { GeoPoint, MapPlace, NearbyRadiusKm } from "@/lib/map/types";

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in kilometres */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function hasCoordinates(place: Pick<MapPlace, "latitude" | "longitude">): place is MapPlace & {
  latitude: number;
  longitude: number;
} {
  return (
    place.latitude != null &&
    place.longitude != null &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  );
}

export function filterPlacesWithinRadius(
  places: MapPlace[],
  center: GeoPoint,
  radiusKm: NearbyRadiusKm
): MapPlace[] {
  return places.filter((place) => {
    if (!hasCoordinates(place)) return false;
    return distanceKm(center, { latitude: place.latitude, longitude: place.longitude }) <= radiusKm;
  });
}

export type LngLatBounds = [[number, number], [number, number]];

/** Bounding box for all mappable places */
export function getPlacesBounds(places: MapPlace[]): LngLatBounds | null {
  const coords = places.filter(hasCoordinates);
  if (coords.length === 0) return null;

  let minLng = coords[0].longitude;
  let maxLng = coords[0].longitude;
  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;

  for (const p of coords) {
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export type PlacesFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    id: string;
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: Record<string, string>;
  }[];
};

export function placesToGeoJSON(places: MapPlace[]): PlacesFeatureCollection {
  return {
    type: "FeatureCollection",
    features: places.filter(hasCoordinates).map((place) => ({
      type: "Feature",
      id: place.id,
      geometry: {
        type: "Point",
        coordinates: [place.longitude, place.latitude],
      },
      properties: {
        id: place.id,
        name: place.name,
        categorySlug: place.category?.slug ?? "other",
        visitStatus: place.visitStatus,
        markerIcon: getMarkerIconId(place.category?.slug, place.visitStatus),
      },
    })),
  };
}

export { getCategoryMarkerEmoji } from "@/lib/map/category-markers";
