export function extractGooglePlaceId(url: string): string | null {
  const cidMatch = url.match(/1s(0x[a-f0-9]+:0x[a-f0-9]+)/i);
  if (cidMatch) return cidMatch[1];

  const placeIdMatch = url.match(/place_id[=:]([A-Za-z0-9_-]+)/);
  if (placeIdMatch) return placeIdMatch[1];

  const dataMatch = url.match(/data=![^!]*!1s([^!/?]+)/);
  if (dataMatch) return decodeURIComponent(dataMatch[1]);

  return null;
}

export function normalizeGoogleMapsUrl(url: string): string {
  return url.trim().replace(/\s+/g, "");
}

export function buildSearchText(parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .map((p) => p!.trim())
    .join(" ");
}

export function extractPlaceNameFromUrl(url: string): string | null {
  const match = url.match(/\/place\/([^/@?]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1].replace(/\+/g, " "));
}
