import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  assetFolderForPrefix,
  buildStorageKey,
} from "@/lib/images/assets";
import { profileR2 } from "@/lib/debug/profiler";
import { isProfilingEnabled } from "@/lib/debug/enabled";
import { recordR2Transfer } from "@/lib/debug/metrics";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const LOCAL_IMAGES_DIR = path.join(process.cwd(), "public", "images_to_use");

function extFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

async function getR2Bucket(): Promise<R2Bucket | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    return (env as CloudflareEnv).ASSETS_BUCKET ?? null;
  } catch {
    return null;
  }
}

async function uploadToR2(
  data: ArrayBuffer | Uint8Array,
  key: string,
  contentType: string
): Promise<boolean> {
  const bucket = await getR2Bucket();
  if (!bucket) return false;

  const put = async () => {
    await bucket.put(key, data, {
      httpMetadata: { contentType },
    });
    return true;
  };

  if (!isProfilingEnabled()) return put();

  return profileR2("R2 Upload", async () => {
    const started = performance.now();
    const ok = await put();
    recordR2Transfer({
      kind: "upload",
      bytes: data.byteLength,
      durationMs: performance.now() - started,
    });
    return ok;
  });
}

/** Returns R2 storage key (e.g. `collections/cover-123.jpg`) */
export async function saveImageBuffer(
  data: Uint8Array,
  contentType: string,
  filenamePrefix: string
): Promise<string> {
  if (data.byteLength > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5 MB");
  }

  const ext = extFromContentType(contentType);
  const filename = `${filenamePrefix}-${Date.now()}.${ext}`;
  const key = buildStorageKey(filenamePrefix, filename);

  const uploaded = await uploadToR2(data, key, contentType);
  if (uploaded) return key;

  // Local dev fallback — mirror R2 folder structure under public/images_to_use/
  const folder = assetFolderForPrefix(filenamePrefix);
  const localDir = path.join(LOCAL_IMAGES_DIR, folder);
  await mkdir(localDir, { recursive: true });
  await writeFile(path.join(localDir, filename), data);
  return key;
}

export async function saveLocalImage(file: File, filenamePrefix: string): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5 MB");
  }

  const bytes = await file.arrayBuffer();
  return saveImageBuffer(new Uint8Array(bytes), file.type, filenamePrefix);
}

export async function saveRemoteImageBuffer(
  buffer: Buffer,
  contentType: string,
  filenamePrefix: string
): Promise<string> {
  return saveImageBuffer(new Uint8Array(buffer), contentType, filenamePrefix);
}
