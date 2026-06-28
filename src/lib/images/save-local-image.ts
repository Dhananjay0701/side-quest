import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  assetFolderForPrefix,
  buildStorageKey,
} from "@/lib/images/assets";
import { getR2BucketOrNull } from "@/lib/images/asset-debug";
import { isR2S3Configured, uploadToR2ViaS3 } from "@/lib/images/r2-s3-upload";
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
  return getR2BucketOrNull();
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
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
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

export type ImageStorageBackend = "r2-binding" | "r2-s3" | "local";

export type ImageSaveResult = {
  key: string;
  backend: ImageStorageBackend;
};

/** Returns R2 storage key (e.g. `collections/cover-123.jpg`) or local path. */
export async function saveImageBuffer(
  data: Uint8Array,
  contentType: string,
  filenamePrefix: string,
  explicitKey?: string
): Promise<string> {
  return (await saveImageBufferWithMeta(data, contentType, filenamePrefix, explicitKey)).key;
}

export async function saveImageBufferWithMeta(
  data: Uint8Array,
  contentType: string,
  filenamePrefix: string,
  explicitKey?: string
): Promise<ImageSaveResult> {
  if (data.byteLength > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5 MB");
  }

  const ext = extFromContentType(contentType);
  const filename = `${filenamePrefix}-${Date.now()}.${ext}`;
  const key = explicitKey ?? buildStorageKey(filenamePrefix, filename);

  // Prefer real R2 S3 API when configured. OpenNext dev exposes a local ASSETS_BUCKET
  // binding (Miniflare) that does NOT write to the production bucket behind pub-*.r2.dev.
  if (isR2S3Configured()) {
    const s3 = await uploadToR2ViaS3(data, key, contentType);
    if (s3.ok) return { key, backend: "r2-s3" };
    throw new Error(
      `R2 upload failed (${s3.errorCode ?? "UNKNOWN"}): ${s3.error}. ` +
        "Check GET /api/studio/r2-status or restart dev server after editing .env.local."
    );
  }

  const bindingUploaded = await uploadToR2(data, key, contentType);
  if (bindingUploaded) return { key, backend: "r2-binding" };

  // Local dev fallback when no R2 binding or S3 credentials
  const localDir = explicitKey
    ? path.join(LOCAL_IMAGES_DIR, path.dirname(explicitKey))
    : path.join(LOCAL_IMAGES_DIR, assetFolderForPrefix(filenamePrefix));
  const localFilename = explicitKey ? path.basename(explicitKey) : filename;
  await mkdir(localDir, { recursive: true });
  await writeFile(path.join(localDir, localFilename), data);
  return { key: `/images_to_use/${key}`, backend: "local" };
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
