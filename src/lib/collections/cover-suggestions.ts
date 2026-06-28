import { createAdminClient } from "@/lib/supabase/admin";
import { listR2Sample } from "@/lib/images/asset-debug";
import { listR2KeysViaS3 } from "@/lib/images/r2-s3-upload";
import { isR2AssetKey, resolveAssetUrl } from "@/lib/images/assets";

export interface CoverSuggestion {
  key: string;
  /** Server-resolved URL — prefer this in the browser */
  url: string;
}

const IMAGE_KEY = /\.(jpe?g|png|webp|gif)$/i;

const CURATED_FALLBACK_KEYS: string[] = [];

function uniqueImageKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    const normalized = key.replace(/^\//, "");
    if (!normalized || normalized === "collections/" || normalized === "collections") continue;
    if (!IMAGE_KEY.test(normalized)) continue;
    if (!isR2AssetKey(normalized) && !normalized.startsWith("collections/")) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/** Pick `count` keys; repeats allowed when the pool is smaller than count. */
function pickSuggestionKeys(pool: string[], count: number): string[] {
  if (pool.length === 0) return [];
  const picked: string[] = [];
  while (picked.length < count) {
    picked.push(pool[Math.floor(Math.random() * pool.length)]!);
  }
  return picked;
}

async function collectCoverKeys(): Promise<string[]> {
  const keys: string[] = [];

  const r2 = await listR2Sample("collections/", 100);
  if (r2.bucketAvailable && r2.objects.length > 0) {
    keys.push(...r2.objects);
  }

  if (keys.length < 3) {
    keys.push(...(await listR2KeysViaS3("collections/", 120)));
  }

  if (keys.length < 3) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("collections")
      .select("cover_image_url")
      .eq("is_deleted", false)
      .not("cover_image_url", "is", null)
      .limit(60);

    for (const row of data ?? []) {
      if (row.cover_image_url) keys.push(row.cover_image_url);
    }
  }

  keys.push(...CURATED_FALLBACK_KEYS);

  return uniqueImageKeys(keys);
}

function toSuggestion(key: string): CoverSuggestion {
  const url = resolveAssetUrl(key);
  return { key, url: url ?? `/cdn/${key}` };
}

/** Random cover tiles — R2 listing with S3 + DB fallback (AI suggestions later). */
export async function getCoverSuggestions(
  _name?: string,
  _description?: string
): Promise<CoverSuggestion[]> {
  const pool = await collectCoverKeys();
  if (pool.length === 0) return [];
  const picked = pickSuggestionKeys(pool, 3);
  return picked.map(toSuggestion);
}
