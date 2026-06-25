import { isProfilingEnabled } from "@/lib/debug/enabled";
import { logStatisticBlock } from "@/lib/debug/logger";

export interface OperationStatistics {
  count: number;
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  samples: number[];
}

const MAX_SAMPLES_PER_OPERATION = 500;
const registry = new Map<string, number[]>();

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function computeStats(samples: number[]): OperationStatistics {
  if (samples.length === 0) {
    return { count: 0, average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, samples: [] };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  return {
    count: sorted.length,
    average: sum / sorted.length,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    samples: sorted,
  };
}

export function recordOperationDuration(name: string, durationMs: number): void {
  if (!isProfilingEnabled()) return;
  const samples = registry.get(name) ?? [];
  samples.push(durationMs);
  if (samples.length > MAX_SAMPLES_PER_OPERATION) samples.shift();
  registry.set(name, samples);
}

export function getOperationStatistics(name: string): OperationStatistics {
  return computeStats(registry.get(name) ?? []);
}

export function getAllOperationStatistics(): Record<string, OperationStatistics> {
  const result: Record<string, OperationStatistics> = {};
  for (const [name, samples] of registry) {
    result[name] = computeStats(samples);
  }
  return result;
}

export function resetStatistics(): void {
  if (!isProfilingEnabled()) return;
  registry.clear();
}

export function logTopStatistics(limit = 10): void {
  if (!isProfilingEnabled()) return;
  const entries = [...registry.entries()]
    .map(([name, samples]) => ({ name, stats: computeStats(samples) }))
    .sort((a, b) => b.stats.average - a.stats.average)
    .slice(0, limit);

  for (const { name, stats } of entries) {
    logStatisticBlock(name, stats);
  }
}
