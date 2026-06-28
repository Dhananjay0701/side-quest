import { saveImageBuffer } from "@/lib/images/save-local-image";

const ALLOWED_PREFIX = /^[a-z0-9-]+$/;

export function buildVersionedCmsFilename(slug: string, version: number, ext: string): string {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "asset";
  return `${safeSlug}-v${version}.${ext}`;
}

export async function saveCmsImage(
  data: Uint8Array,
  contentType: string,
  slug: string,
  version: number
): Promise<string> {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "asset";
  if (!ALLOWED_PREFIX.test(safeSlug)) {
    throw new Error("Invalid image slug");
  }

  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = buildVersionedCmsFilename(safeSlug, version, ext);
  const key = `cms/${filename}`;
  return saveImageBuffer(data, contentType, `cms-${safeSlug}`, key);
}

export async function saveCityImage(
  data: Uint8Array,
  contentType: string,
  slug: string,
  version = 1
): Promise<string> {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "city";
  if (!ALLOWED_PREFIX.test(safeSlug)) {
    throw new Error("Invalid city slug");
  }

  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = `${safeSlug}-v${version}.${ext}`;
  const key = `city_assets/${filename}`;
  return saveImageBuffer(data, contentType, `city-${safeSlug}`, key);
}
