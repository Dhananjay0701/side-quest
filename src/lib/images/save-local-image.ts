import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const LOCAL_IMAGES_DIR = path.join(process.cwd(), "public", "images_to_use");

export function getPublicImageUrl(filename: string): string {
  return `/images_to_use/${filename}`;
}

export async function saveLocalImage(
  file: File,
  filenamePrefix: string
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5 MB");
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${filenamePrefix}-${Date.now()}.${ext}`;
  const filePath = path.join(LOCAL_IMAGES_DIR, filename);

  await mkdir(LOCAL_IMAGES_DIR, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  return getPublicImageUrl(filename);
}

function extFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

export async function saveRemoteImageBuffer(
  buffer: Buffer,
  contentType: string,
  filenamePrefix: string
): Promise<string> {
  if (buffer.byteLength > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5 MB");
  }

  const ext = extFromContentType(contentType);
  const filename = `${filenamePrefix}-${Date.now()}.${ext}`;
  const filePath = path.join(LOCAL_IMAGES_DIR, filename);

  await mkdir(LOCAL_IMAGES_DIR, { recursive: true });
  await writeFile(filePath, buffer);

  return getPublicImageUrl(filename);
}
