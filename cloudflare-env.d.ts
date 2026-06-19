/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  ASSETS: Fetcher;
  ASSETS_BUCKET: R2Bucket;
  NEXT_INC_CACHE_R2_BUCKET: R2Bucket;
  IMAGES: unknown;
  WORKER_SELF_REFERENCE: Fetcher;
}
