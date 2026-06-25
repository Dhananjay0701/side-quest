import { isProfilingEnabled } from "@/lib/debug/enabled";

export interface CacheMetrics {
  hits: number;
  misses: number;
}

export interface DatabaseMetrics {
  queryCount: number;
  slowQueries: { name: string; durationMs: number }[];
  duplicateQueries: string[];
}

export interface R2Metrics {
  uploads: number;
  downloads: number;
  totalBytes: number;
  totalTransferMs: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface ImageMetrics {
  resolved: number;
  totalResolveMs: number;
  slowest: { key: string; durationMs: number } | null;
  broken: number;
}

export interface ApiMetricsEntry {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  payloadBytes?: number;
}

export interface AiMetricsEntry {
  model: string;
  operation: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
}

export interface NavigationMetricsEntry {
  route: string;
  transitionMs: number;
  serverRenderMs?: number;
}

export interface MemorySnapshot {
  heapUsedMb?: number;
  heapTotalMb?: number;
  externalMb?: number;
}

export interface GlobalMetrics {
  cache: Record<string, CacheMetrics>;
  database: DatabaseMetrics;
  r2: R2Metrics;
  images: ImageMetrics;
  api: ApiMetricsEntry[];
  ai: AiMetricsEntry[];
  navigation: NavigationMetricsEntry[];
  memory: MemorySnapshot[];
}

function emptyGlobalMetrics(): GlobalMetrics {
  return {
    cache: {},
    database: { queryCount: 0, slowQueries: [], duplicateQueries: [] },
    r2: {
      uploads: 0,
      downloads: 0,
      totalBytes: 0,
      totalTransferMs: 0,
      cacheHits: 0,
      cacheMisses: 0,
    },
    images: { resolved: 0, totalResolveMs: 0, slowest: null, broken: 0 },
    api: [],
    ai: [],
    navigation: [],
    memory: [],
  };
}

let globalMetrics: GlobalMetrics = emptyGlobalMetrics();

const SLOW_QUERY_MS = 100;
const MAX_SLOW_QUERIES = 50;
const MAX_API_ENTRIES = 200;
const MAX_AI_ENTRIES = 100;

export function getGlobalMetrics(): GlobalMetrics {
  return globalMetrics;
}

export function resetGlobalMetrics(): void {
  if (!isProfilingEnabled()) return;
  globalMetrics = emptyGlobalMetrics();
}

export function recordCacheMetric(layer: string, hit: boolean): void {
  if (!isProfilingEnabled()) return;
  const bucket = globalMetrics.cache[layer] ?? { hits: 0, misses: 0 };
  if (hit) bucket.hits += 1;
  else bucket.misses += 1;
  globalMetrics.cache[layer] = bucket;
}

export function recordSlowQuery(name: string, durationMs: number): void {
  if (!isProfilingEnabled()) return;
  globalMetrics.database.queryCount += 1;
  if (durationMs >= SLOW_QUERY_MS) {
    globalMetrics.database.slowQueries.push({ name, durationMs });
    if (globalMetrics.database.slowQueries.length > MAX_SLOW_QUERIES) {
      globalMetrics.database.slowQueries.shift();
    }
  }
}

export function recordDuplicateQuery(name: string): void {
  if (!isProfilingEnabled()) return;
  if (!globalMetrics.database.duplicateQueries.includes(name)) {
    globalMetrics.database.duplicateQueries.push(name);
  }
}

export function recordR2Transfer(args: {
  kind: "upload" | "download";
  bytes: number;
  durationMs: number;
  cacheHit?: boolean;
}): void {
  if (!isProfilingEnabled()) return;
  if (args.kind === "upload") globalMetrics.r2.uploads += 1;
  else globalMetrics.r2.downloads += 1;
  globalMetrics.r2.totalBytes += args.bytes;
  globalMetrics.r2.totalTransferMs += args.durationMs;
  if (args.cacheHit === true) globalMetrics.r2.cacheHits += 1;
  if (args.cacheHit === false) globalMetrics.r2.cacheMisses += 1;
}

export function recordImageResolve(key: string, durationMs: number, broken = false): void {
  if (!isProfilingEnabled()) return;
  globalMetrics.images.resolved += 1;
  globalMetrics.images.totalResolveMs += durationMs;
  if (broken) globalMetrics.images.broken += 1;
  const slowest = globalMetrics.images.slowest;
  if (!slowest || durationMs > slowest.durationMs) {
    globalMetrics.images.slowest = { key, durationMs };
  }
}

export function recordApiMetric(entry: ApiMetricsEntry): void {
  if (!isProfilingEnabled()) return;
  globalMetrics.api.push(entry);
  if (globalMetrics.api.length > MAX_API_ENTRIES) globalMetrics.api.shift();
}

export function recordAiMetric(entry: AiMetricsEntry): void {
  if (!isProfilingEnabled()) return;
  globalMetrics.ai.push(entry);
  if (globalMetrics.ai.length > MAX_AI_ENTRIES) globalMetrics.ai.shift();
}

export function recordNavigationMetric(entry: NavigationMetricsEntry): void {
  if (!isProfilingEnabled()) return;
  globalMetrics.navigation.push(entry);
}

export function recordMemorySnapshot(): void {
  if (!isProfilingEnabled()) return;
  if (typeof process === "undefined" || !process.memoryUsage) return;
  const mem = process.memoryUsage();
  globalMetrics.memory.push({
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    externalMb: Math.round(mem.external / 1024 / 1024),
  });
  if (globalMetrics.memory.length > 100) globalMetrics.memory.shift();
}

export function cacheHitRate(layer: string): number {
  const bucket = globalMetrics.cache[layer];
  if (!bucket) return 0;
  const total = bucket.hits + bucket.misses;
  return total === 0 ? 0 : bucket.hits / total;
}
