"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, RefreshCw, Sparkles, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseApiJson } from "@/lib/api/response";
import type { SearchStatsPayload } from "@/lib/db/queries/search-stats";
import { cn } from "@/lib/utils";

const PERIODS = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "All time", days: null as number | null },
] as const;

function count(stats: SearchStatsPayload | null, provider: string, operation: string): number {
  if (!stats) return 0;
  return stats.totalsByKey[`${provider}:${operation}`] ?? 0;
}

function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/15 bg-card/30 p-4", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted/45">{sub}</p> : null}
    </div>
  );
}

function formatUsd(amount: number): string {
  if (amount < 0.01 && amount > 0) return "< $0.01";
  return `$${amount.toFixed(2)}`;
}

function formatRate(amount: number): string {
  if (amount >= 0.01) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(5)}`;
}

export function SearchStatsDashboard() {
  const [periodDays, setPeriodDays] = useState<number | null>(7);
  const [stats, setStats] = useState<SearchStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = periodDays == null ? "days=all" : `days=${periodDays}`;
      const res = await fetch(`/api/studio/search-stats?${qs}`, { credentials: "same-origin" });
      const json = await parseApiJson<SearchStatsPayload>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to load stats");
      setStats(json.data ?? null);
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const eff = stats?.effectiveness;
  const billing = stats?.billing;
  const googleAc = count(stats, "google", "autocomplete");
  const googleHit = count(stats, "google", "cache_hit");
  const googleMiss = count(stats, "google", "cache_miss");
  const localSuggest = count(stats, "local", "suggest");
  const suggestRequests = count(stats, "search", "suggest_request");
  const suggestNoGoogle = count(stats, "search", "suggest_no_google");
  const geminiCalls = count(stats, "gemini", "enrichment");

  const cacheHitRate = (hits: number, misses: number) => {
    const total = hits + misses;
    if (!total) return "—";
    return `${Math.round((hits / total) * 100)}%`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Search usage</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted/55">
            API call counts, Google Places pricing with monthly free tiers, and how effectively your
            local database is reducing paid Google calls.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPeriodDays(p.days)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs transition-colors",
              periodDays === p.days
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/15 text-muted/55 hover:border-border/30 hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-400/90">{error}</p> : null}

      {loading && !stats ? (
        <p className="text-sm text-muted/50">Loading stats…</p>
      ) : stats && eff && billing ? (
        <>
          <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/30 to-card/20 p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Search effectiveness</h3>
                <p className="mt-1 text-xs text-muted/50">
                  How much your local DB and deduplication are saving on Google
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted/40">Searches</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {eff.totalSearches.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted/40">
                      Served from DB
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-400/90">
                      {eff.servedFromDbPercent}%
                    </p>
                    <p className="text-[11px] text-muted/40">
                      {eff.servedFromDb.toLocaleString()} without Google API
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted/40">Google calls</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {eff.googleAutocompletePercent}%
                    </p>
                    <p className="text-[11px] text-muted/40">
                      {eff.googleAutocompleteCalls.toLocaleString()} autocomplete
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted/40">
                      Duplicates prevented
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {eff.duplicatePlacesPrevented.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted/40">
                      {eff.enrichmentsSkipped.toLocaleString()} enrichments skipped
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted/40">
                      Est. Google savings
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-emerald-400/90">
                      <TrendingDown className="h-5 w-5" />
                      {formatUsd(eff.estimatedGoogleSavingsUsd)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Suggest requests"
              value={suggestRequests.toLocaleString()}
              sub={`${suggestNoGoogle.toLocaleString()} skipped Google · ${localSuggest.toLocaleString()} DB lookups`}
            />
            <StatCard
              label="Google Autocomplete"
              value={googleAc.toLocaleString()}
              sub={`Cache hit ${cacheHitRate(googleHit, googleMiss)} · ${eff.autocompleteCacheHits.toLocaleString()} hits`}
            />
            <StatCard
              label="Free tier left (month)"
              value={(
                billing.lineItems[0].freeRemaining +
                billing.lineItems[1].freeRemaining
              ).toLocaleString()}
              sub={`AC ${billing.lineItems[0].freeRemaining.toLocaleString()} · Details ${billing.lineItems[1].freeRemaining.toLocaleString()} · Photos ${billing.lineItems[2].freeRemaining.toLocaleString()}`}
            />
            <StatCard
              label="Est. billable (month)"
              value={formatUsd(stats.estimatedCostUsd)}
              sub={`${stats.billingMonth} UTC · incl. Gemini ${formatUsd(billing.geminiCostUsd)}`}
            />
          </div>

          <section className="rounded-xl border border-border/15 bg-card/20 p-5">
            <h3 className="text-sm font-semibold">Google Places API pricing</h3>
            <p className="mt-1 text-xs text-muted/45">
              Current model with session tokens. Calls shown for selected period; free remaining and
              billable cost use calendar month-to-date ({stats.billingMonth}).
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/10 text-xs text-muted/40">
                    <th className="pb-2 pr-4 font-medium">API</th>
                    <th className="pb-2 pr-4 font-medium text-right">Period calls</th>
                    <th className="pb-2 pr-4 font-medium text-right">Free / month</th>
                    <th className="pb-2 pr-4 font-medium text-right">Free left</th>
                    <th className="pb-2 pr-4 font-medium text-right">Rate (after free)</th>
                    <th className="pb-2 font-medium text-right">Billable (month)</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.lineItems.map((row) => (
                    <tr key={row.label} className="border-b border-border/5 last:border-0">
                      <td className="py-2.5 pr-4 text-foreground/90">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {row.usageCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted/55">
                        {row.freeLimit > 0 ? row.freeLimit.toLocaleString() : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-emerald-400/80">
                        {row.freeLimit > 0 ? row.freeRemaining.toLocaleString() : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted/55">
                        {formatRate(row.unitPriceUsd)}
                        {row.label.includes("Autocomplete") ? "/ session" : "/ req"}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {row.billableCount > 0 ? (
                          <span className="text-amber-400/90">
                            {row.billableCount.toLocaleString()} · {formatUsd(row.costUsd)}
                          </span>
                        ) : (
                          <span className="text-muted/45">$0.00</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border/10">
                    <td className="py-2.5 pr-4 text-foreground/90">Gemini enrichment</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {geminiCalls.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-muted/45">—</td>
                    <td className="py-2.5 pr-4 text-right text-muted/45">—</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted/55">
                      {formatRate(billing.pricing.geminiPerCall)}/ call
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{formatUsd(billing.geminiCostUsd)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border/15 bg-card/20 p-5">
            <h3 className="text-sm font-semibold">Enrichment jobs</h3>
            <p className="mt-1 text-xs text-muted/45">
              Async jobs queued when places cross the save / popularity threshold
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["Completed", stats.enrichmentJobs.completed],
                  ["Queued", stats.enrichmentJobs.queued],
                  ["Processing", stats.enrichmentJobs.processing],
                  ["Failed", stats.enrichmentJobs.failed],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-background/30 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted/40">{label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border/15 bg-card/20 p-5">
            <h3 className="text-sm font-semibold">Autocomplete cache footprint</h3>
            <p className="mt-1 text-xs text-muted/45">
              Unique cached Google queries still warm (not the same as hit rate)
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span>
                Google: <strong className="tabular-nums">{stats.autocompleteCache.google}</strong>
              </span>
              <span>
                Total: <strong className="tabular-nums">{stats.autocompleteCache.total}</strong>
              </span>
            </div>
          </section>

          {stats.usage.length > 0 ? (
            <section className="rounded-xl border border-border/15 bg-card/20 p-5">
              <h3 className="text-sm font-semibold">Raw counters</h3>
              <ul className="mt-3 space-y-1.5 font-mono text-xs text-muted/55">
                {stats.usage.map((row) => (
                  <li key={`${row.provider}:${row.operation}`}>
                    {row.provider}.{row.operation}: {row.callCount.toLocaleString()}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <ul className="space-y-1 text-xs text-muted/40">
            {stats.notes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
