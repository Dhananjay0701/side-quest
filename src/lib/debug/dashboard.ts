import { getGlobalMetrics, cacheHitRate } from "@/lib/debug/metrics";
import { getAllOperationStatistics } from "@/lib/debug/statistics";

/** Snapshot shape for a future observability dashboard — no UI yet. */
export interface ObservabilitySnapshot {
  capturedAt: string;
  operations: ReturnType<typeof getAllOperationStatistics>;
  global: ReturnType<typeof getGlobalMetrics>;
  cacheHitRates: Record<string, number>;
  slowestPages: { name: string; averageMs: number; p95Ms: number }[];
  slowestQueries: { name: string; averageMs: number; p95Ms: number }[];
  slowestApis: { name: string; averageMs: number; p95Ms: number }[];
  aiUsage: ReturnType<typeof getGlobalMetrics>["ai"];
}

function topOperationsByAverage(prefix?: string, limit = 10) {
  const ops = getAllOperationStatistics();
  return Object.entries(ops)
    .filter(([name]) => (prefix ? name.startsWith(prefix) : true))
    .map(([name, stats]) => ({ name, averageMs: stats.average, p95Ms: stats.p95 }))
    .sort((a, b) => b.averageMs - a.averageMs)
    .slice(0, limit);
}

export function getObservabilitySnapshot(): ObservabilitySnapshot {
  const global = getGlobalMetrics();
  const operations = getAllOperationStatistics();

  const cacheHitRates: Record<string, number> = {};
  for (const layer of Object.keys(global.cache)) {
    cacheHitRates[layer] = cacheHitRate(layer);
  }

  return {
    capturedAt: new Date().toISOString(),
    operations,
    global,
    cacheHitRates,
    slowestPages: topOperationsByAverage(undefined, 20).filter((o) =>
      /Page$|Layout$/.test(o.name)
    ),
    slowestQueries: topOperationsByAverage("db:", 20),
    slowestApis: topOperationsByAverage("api:", 20),
    aiUsage: global.ai,
  };
}
