import type { Query, QueryCacheNotifyEvent } from "@tanstack/react-query";

const CLIENT_PROFILING =
  process.env.NEXT_PUBLIC_DEBUG_PROFILING === "true" ||
  process.env.DEBUG_PROFILING === "true";

export interface QueryCacheStats {
  hits: number;
  misses: number;
  backgroundRefreshes: number;
  invalidations: number;
  deduplicated: number;
  totalFetchMs: number;
  fetchCount: number;
  lifetimesMs: number[];
}

const stats: QueryCacheStats = {
  hits: 0,
  misses: 0,
  backgroundRefreshes: 0,
  invalidations: 0,
  deduplicated: 0,
  totalFetchMs: 0,
  fetchCount: 0,
  lifetimesMs: [],
};

const inFlightKeys = new Set<string>();

function keyLabel(query: Query): string {
  const meta = query.meta as { label?: string } | undefined;
  if (meta?.label) return meta.label;
  const k = query.queryKey[0];
  return typeof k === "string" ? k : JSON.stringify(query.queryKey);
}

function formatAge(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m${remSec}s`;
}

function logBlock(label: string, lines: string[]) {
  if (!CLIENT_PROFILING) return;
  console.log(`\n${label}`);
  for (const line of lines) console.log(line);
}

export function getClientQueryCacheStats(): QueryCacheStats {
  return { ...stats, lifetimesMs: [...stats.lifetimesMs] };
}

export function recordQueryFetchStart(queryKey: readonly unknown[]): boolean {
  const serialized = JSON.stringify(queryKey);
  if (inFlightKeys.has(serialized)) {
    stats.deduplicated += 1;
    if (CLIENT_PROFILING) {
      logBlock("Query Deduplication", [`Key: ${serialized}`]);
    }
    return false;
  }
  inFlightKeys.add(serialized);
  return true;
}

export function recordQueryFetchEnd(
  queryKey: readonly unknown[],
  label: string,
  durationMs: number,
  kind: "initial" | "background"
) {
  inFlightKeys.delete(JSON.stringify(queryKey));
  stats.totalFetchMs += durationMs;
  stats.fetchCount += 1;
  if (kind === "background") stats.backgroundRefreshes += 1;

  if (!CLIENT_PROFILING) return;

  logBlock(`${label} Cache`, [
    kind === "background" ? "Background Refresh" : "Fetch",
    `Fetch: ${Math.round(durationMs)}ms`,
  ]);
}

export function recordQueryCacheHit(label: string, ageMs: number, background: boolean) {
  stats.hits += 1;
  stats.lifetimesMs.push(ageMs);
  if (stats.lifetimesMs.length > 200) stats.lifetimesMs.shift();

  if (!CLIENT_PROFILING) return;

  logBlock(`${label} Cache`, [
    "Hit",
    `Age: ${formatAge(ageMs)}`,
    background ? "Refresh: Background" : "Render: Instant",
  ]);
}

export function recordQueryCacheMiss(label: string) {
  stats.misses += 1;
  if (!CLIENT_PROFILING) return;
  logBlock(`${label} Cache`, ["Miss", "Render: Skeleton"]);
}

export function recordQueryInvalidation(keys: string[], reason: string) {
  stats.invalidations += 1;
  if (!CLIENT_PROFILING) return;
  logBlock("Cache Invalidation", [`Keys: ${keys.join(", ")}`, `Reason: ${reason}`]);
}

export function attachQueryCacheObserver(getCache: () => { subscribe: (fn: (e: QueryCacheNotifyEvent) => void) => () => void }) {
  if (!CLIENT_PROFILING) return () => {};

  return getCache().subscribe((event: QueryCacheNotifyEvent) => {
    if (event.type !== "updated") return;
    const query = event.query;
    const label = keyLabel(query);
    const action = event.action;

    if (action.type === "invalidate") {
      recordQueryInvalidation([label], "invalidate");
    }
  });
}

export function averageCacheLifetimeMs(): number {
  if (stats.lifetimesMs.length === 0) return 0;
  return stats.lifetimesMs.reduce((a, b) => a + b, 0) / stats.lifetimesMs.length;
}

export function averageFetchTimeMs(): number {
  if (stats.fetchCount === 0) return 0;
  return stats.totalFetchMs / stats.fetchCount;
}
