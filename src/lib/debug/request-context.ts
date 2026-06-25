import { AsyncLocalStorage } from "node:async_hooks";
import { isProfilingEnabled } from "@/lib/debug/enabled";

export type MetricCategory =
  | "database"
  | "authentication"
  | "rendering"
  | "api"
  | "external"
  | "images"
  | "r2"
  | "ai"
  | "cache"
  | "navigation"
  | "memory"
  | "other";

export interface ProfileSpan {
  name: string;
  category: MetricCategory;
  durationMs: number;
  depth: number;
  children: ProfileSpan[];
  metadata?: Record<string, unknown>;
}

export interface RequestMetrics {
  databaseMs: number;
  authenticationMs: number;
  renderingMs: number;
  apiMs: number;
  externalMs: number;
  imagesMs: number;
  r2Ms: number;
  aiMs: number;
  cacheMs: number;
  databaseQueryCount: number;
  duplicateQueries: string[];
  cacheHits: number;
  cacheMisses: number;
}

export interface RequestContext {
  id: string;
  route?: string;
  startedAt: number;
  depth: number;
  spans: ProfileSpan[];
  spanStack: ProfileSpan[];
  metrics: RequestMetrics;
  queryFingerprints: Map<string, number>;
  finalized: boolean;
}

const storage = new AsyncLocalStorage<RequestContext>();

function createMetrics(): RequestMetrics {
  return {
    databaseMs: 0,
    authenticationMs: 0,
    renderingMs: 0,
    apiMs: 0,
    externalMs: 0,
    imagesMs: 0,
    r2Ms: 0,
    aiMs: 0,
    cacheMs: 0,
    databaseQueryCount: 0,
    duplicateQueries: [],
    cacheHits: 0,
    cacheMisses: 0,
  };
}

export function generateRequestId(): string {
  return Math.random().toString(16).slice(2, 8);
}

export function createRequestContext(id: string, route?: string): RequestContext {
  return {
    id,
    route,
    startedAt: Date.now(),
    depth: 0,
    spans: [],
    spanStack: [],
    metrics: createMetrics(),
    queryFingerprints: new Map(),
    finalized: false,
  };
}

export function getRequestContext(): RequestContext | undefined {
  if (!isProfilingEnabled()) return undefined;
  return storage.getStore();
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export async function runWithRequestContextAsync<T>(
  ctx: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return storage.run(ctx, fn);
}

export function enterSpan(span: ProfileSpan): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  const parent = ctx.spanStack[ctx.spanStack.length - 1];
  if (parent) parent.children.push(span);
  else ctx.spans.push(span);
  ctx.spanStack.push(span);
  ctx.depth = span.depth;
}

export function exitSpan(): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  ctx.spanStack.pop();
  ctx.depth = ctx.spanStack.length;
}

export function addCategoryDuration(category: MetricCategory, ms: number): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  switch (category) {
    case "database":
      ctx.metrics.databaseMs += ms;
      break;
    case "authentication":
      ctx.metrics.authenticationMs += ms;
      break;
    case "rendering":
      ctx.metrics.renderingMs += ms;
      break;
    case "api":
      ctx.metrics.apiMs += ms;
      break;
    case "external":
      ctx.metrics.externalMs += ms;
      break;
    case "images":
      ctx.metrics.imagesMs += ms;
      break;
    case "r2":
      ctx.metrics.r2Ms += ms;
      break;
    case "ai":
      ctx.metrics.aiMs += ms;
      break;
    case "cache":
      ctx.metrics.cacheMs += ms;
      break;
    default:
      break;
  }
}

export function recordQueryFingerprint(name: string): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  const count = (ctx.queryFingerprints.get(name) ?? 0) + 1;
  ctx.queryFingerprints.set(name, count);
  ctx.metrics.databaseQueryCount += 1;
  if (count === 2) {
    ctx.metrics.duplicateQueries.push(name);
  }
}

export function recordCacheHit(): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  ctx.metrics.cacheHits += 1;
}

export function recordCacheMiss(): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  ctx.metrics.cacheMisses += 1;
}

export function getRequestTotalMs(ctx: RequestContext): number {
  return Date.now() - ctx.startedAt;
}
