import { createAdminClient } from "@/lib/supabase/admin";
import { getSearchConfig } from "@/lib/search/config";
import { providerFromCacheKey, recordSearchUsage } from "@/lib/search/usage";

export async function getCachedAutocomplete<T>(cacheKey: string): Promise<T | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("search_autocomplete_cache")
    .select("payload")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  const provider = providerFromCacheKey(cacheKey);
  if (provider) {
    recordSearchUsage(provider, data?.payload ? "cache_hit" : "cache_miss");
  }

  return (data?.payload as T) ?? null;
}

export async function setCachedAutocomplete(
  cacheKey: string,
  provider: string,
  payload: unknown
): Promise<void> {
  const { autocompleteCacheTtlMinutes } = getSearchConfig();
  const expiresAt = new Date(Date.now() + autocompleteCacheTtlMinutes * 60_000).toISOString();
  const supabase = createAdminClient();
  await supabase.from("search_autocomplete_cache").upsert(
    {
      cache_key: cacheKey,
      provider,
      payload,
      expires_at: expiresAt,
    },
    { onConflict: "cache_key" }
  );
}

export function buildCacheKey(
  provider: string,
  q: string,
  lat?: number,
  lng?: number
): string {
  const loc = lat != null && lng != null ? `@${lat.toFixed(3)},${lng.toFixed(3)}` : "";
  return `${provider}:${q.toLowerCase()}${loc}`;
}
