import { createAdminClient } from "@/lib/supabase/admin";

export type SearchUsageProvider = "local" | "google" | "gemini" | "search";

export type SearchUsageOperation =
  | "suggest"
  | "suggest_request"
  | "suggest_no_google"
  | "duplicate_place_prevented"
  | "enrichment_skipped"
  | "autocomplete"
  | "cache_hit"
  | "cache_miss"
  | "place_details"
  | "text_search"
  | "place_photo"
  | "enrichment";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Best-effort counter — never throws to callers. */
export function recordSearchUsage(
  provider: SearchUsageProvider,
  operation: SearchUsageOperation,
  delta = 1
): void {
  if (delta <= 0) return;

  void (async () => {
    try {
      const supabase = createAdminClient();
      await supabase.rpc("increment_search_api_usage", {
        p_usage_date: todayUtc(),
        p_provider: provider,
        p_operation: operation,
        p_delta: delta,
      });
    } catch {
      // Table may not exist until migration 013 is applied
    }
  })();
}

export function providerFromCacheKey(cacheKey: string): SearchUsageProvider | null {
  if (cacheKey.startsWith("google:")) return "google";
  return null;
}
