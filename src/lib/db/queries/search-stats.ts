import { createAdminClient } from "@/lib/supabase/admin";
import {
  aggregateUsageTotals,
  buildGoogleBillingSummary,
  computeSearchEffectiveness,
  getSearchUsageCostRates,
  type GoogleBillingSummary,
  type SearchEffectivenessMetrics,
  type SearchUsageCostRates,
} from "@/lib/search/usage-costs";

export interface SearchUsageRow {
  provider: string;
  operation: string;
  callCount: number;
}

export interface EnrichmentJobStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface AutocompleteCacheStats {
  google: number;
  total: number;
}

export interface SearchStatsPayload {
  periodDays: number | null;
  since: string | null;
  billingMonth: string;
  usage: SearchUsageRow[];
  totalsByKey: Record<string, number>;
  monthToDateByKey: Record<string, number>;
  enrichmentJobs: EnrichmentJobStats;
  autocompleteCache: AutocompleteCacheStats;
  suggestRateLimitTotal: number;
  /** Billable Google + Gemini cost for the current calendar month (UTC) */
  estimatedCostUsd: number;
  billing: GoogleBillingSummary;
  effectiveness: SearchEffectivenessMetrics;
  costRates: SearchUsageCostRates;
  notes: string[];
}

function aggregateUsage(
  rows: { provider: string; operation: string; call_count: number }[]
): { usage: SearchUsageRow[]; totalsByKey: Record<string, number> } {
  const map = new Map<string, number>();

  for (const row of rows) {
    const key = `${row.provider}:${row.operation}`;
    map.set(key, (map.get(key) ?? 0) + Number(row.call_count));
  }

  const usage: SearchUsageRow[] = [...map.entries()]
    .map(([key, callCount]) => {
      const [provider, operation] = key.split(":");
      return { provider, operation, callCount };
    })
    .sort((a, b) => b.callCount - a.callCount);

  const totalsByKey = Object.fromEntries(map);
  return { usage, totalsByKey };
}

function currentBillingMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getSearchStats(periodDays: number | null): Promise<SearchStatsPayload> {
  const supabase = createAdminClient();
  const since =
    periodDays != null
      ? new Date(Date.now() - periodDays * 86_400_000).toISOString().slice(0, 10)
      : null;

  let usageQuery = supabase
    .from("search_api_usage")
    .select("provider, operation, call_count, usage_date");

  if (since) {
    usageQuery = usageQuery.gte("usage_date", since);
  }

  const monthStart = `${currentBillingMonth()}-01`;
  const mtdQuery = supabase
    .from("search_api_usage")
    .select("provider, operation, call_count, usage_date")
    .gte("usage_date", monthStart);

  const [usageRes, mtdRes, jobsRes, cacheRes, rateRes] = await Promise.all([
    usageQuery,
    mtdQuery,
    supabase.from("enrichment_jobs").select("status, created_at"),
    supabase.from("search_autocomplete_cache").select("provider"),
    supabase.from("search_rate_limits").select("request_count, rate_key"),
  ]);

  const usageRows = (usageRes.data ?? []) as {
    provider: string;
    operation: string;
    call_count: number;
    usage_date: string;
  }[];

  const mtdRows = (mtdRes.data ?? []) as {
    provider: string;
    operation: string;
    call_count: number;
    usage_date: string;
  }[];

  const { usage, totalsByKey } = aggregateUsage(usageRows);
  const monthToDateByKey = aggregateUsageTotals(mtdRows);

  const enrichmentJobs: EnrichmentJobStats = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  const sinceMs = since ? new Date(`${since}T00:00:00Z`).getTime() : null;

  for (const job of jobsRes.data ?? []) {
    if (sinceMs && new Date(job.created_at).getTime() < sinceMs) continue;
    const status = job.status as keyof EnrichmentJobStats;
    if (status in enrichmentJobs) enrichmentJobs[status] += 1;
  }

  const cacheByProvider: Record<string, number> = {};
  for (const row of cacheRes.data ?? []) {
    const p = row.provider ?? "unknown";
    cacheByProvider[p] = (cacheByProvider[p] ?? 0) + 1;
  }

  let suggestRateLimitTotal = 0;
  for (const row of rateRes.data ?? []) {
    if (row.rate_key?.startsWith("suggest:")) {
      suggestRateLimitTotal += row.request_count ?? 0;
    }
  }

  const costRates = getSearchUsageCostRates();
  const billing = buildGoogleBillingSummary(totalsByKey, monthToDateByKey);
  const effectiveness = computeSearchEffectiveness(totalsByKey, billing.pricing);

  const notes = [
    "Google pricing: Autocomplete $2.83/1k sessions, Place Details Essentials $5/1k, Photos $7/1k — after monthly free tiers.",
    "Free tier remaining resets each calendar month (UTC). Billable cost reflects month-to-date usage.",
    "Place Details are only called during background enrichment — never on autocomplete select.",
    "DB % = searches served without a Google Autocomplete API call (local hits + autocomplete cache).",
    "Estimated savings = avoided autocomplete sessions + avoided Details/Photos from dedupe and skipped enrichment.",
    "MapLibre/OSM map tiles load in the browser and are not tracked server-side.",
  ];

  if (usageRes.error?.message?.includes("search_api_usage")) {
    notes.unshift("Run migration 013_search_usage.sql to enable live API counters.");
  }

  return {
    periodDays,
    since,
    billingMonth: currentBillingMonth(),
    usage,
    totalsByKey,
    monthToDateByKey,
    enrichmentJobs,
    autocompleteCache: {
      google: cacheByProvider.google ?? 0,
      total: Object.values(cacheByProvider).reduce((a, b) => a + b, 0),
    },
    suggestRateLimitTotal,
    estimatedCostUsd: billing.totalCostUsd,
    billing,
    effectiveness,
    costRates,
    notes,
  };
}
