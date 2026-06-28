import { HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_BUCKET = "random-sidequest-assets";

export type R2S3ProbeResult = {
  configured: boolean;
  bucket: string;
  endpoint: string | null;
  missingEnv: string[];
  headBucketOk: boolean;
  error: string | null;
  errorCode: string | null;
};

export type R2S3UploadResult =
  | { ok: true }
  | { ok: false; error: string; errorCode?: string };

function getR2Env() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = (process.env.R2_BUCKET_NAME?.trim() || DEFAULT_BUCKET);
  const missingEnv = [
    !accountId ? "R2_ACCOUNT_ID" : null,
    !accessKeyId ? "R2_ACCESS_KEY_ID" : null,
    !secretAccessKey ? "R2_SECRET_ACCESS_KEY" : null,
  ].filter((v): v is string => v !== null);

  return { accountId, accessKeyId, secretAccessKey, bucket, missingEnv };
}

function getR2S3Client(): S3Client | null {
  const { accountId, accessKeyId, secretAccessKey, missingEnv } = getR2Env();
  if (missingEnv.length > 0 || !accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function isR2S3Configured(): boolean {
  return getR2S3Client() !== null;
}

function formatAwsError(err: unknown): { message: string; code?: string } {
  if (err && typeof err === "object") {
    const e = err as { message?: string; name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
    const code = e.Code ?? e.name;
    const status = e.$metadata?.httpStatusCode;
    const message = e.message ?? "Unknown R2 error";
    return {
      code,
      message: status ? `${message} (HTTP ${status})` : message,
    };
  }
  return { message: err instanceof Error ? err.message : String(err) };
}

/** Admin/dev diagnostic — can R2 S3 API reach the assets bucket? */
export async function probeR2S3(): Promise<R2S3ProbeResult> {
  const { bucket, missingEnv, accountId } = getR2Env();
  const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null;

  if (missingEnv.length > 0) {
    return {
      configured: false,
      bucket,
      endpoint,
      missingEnv,
      headBucketOk: false,
      error: `Missing env: ${missingEnv.join(", ")}`,
      errorCode: "NOT_CONFIGURED",
    };
  }

  const client = getR2S3Client();
  if (!client) {
    return {
      configured: false,
      bucket,
      endpoint,
      missingEnv: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"],
      headBucketOk: false,
      error: "R2 S3 client could not be created",
      errorCode: "NOT_CONFIGURED",
    };
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return {
      configured: true,
      bucket,
      endpoint,
      missingEnv: [],
      headBucketOk: true,
      error: null,
      errorCode: null,
    };
  } catch (err) {
    const formatted = formatAwsError(err);
    return {
      configured: true,
      bucket,
      endpoint,
      missingEnv: [],
      headBucketOk: false,
      error: formatted.message,
      errorCode: formatted.code ?? "HEAD_BUCKET_FAILED",
    };
  }
}

/** Upload via R2 S3 API when ASSETS_BUCKET binding is unavailable (e.g. `next dev`). */
export async function uploadToR2ViaS3(
  data: ArrayBuffer | Uint8Array,
  key: string,
  contentType: string
): Promise<R2S3UploadResult> {
  const client = getR2S3Client();
  if (!client) {
    return { ok: false, error: "R2 S3 not configured", errorCode: "NOT_CONFIGURED" };
  }

  const { bucket } = getR2Env();
  const body = data instanceof Uint8Array ? data : new Uint8Array(data);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return { ok: true };
  } catch (err) {
    const formatted = formatAwsError(err);
    console.error("[r2-s3] upload failed:", formatted.message);
    return { ok: false, error: formatted.message, errorCode: formatted.code };
  }
}
