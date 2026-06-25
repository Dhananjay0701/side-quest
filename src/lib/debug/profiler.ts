import { headers } from "next/headers";
import type { ReactNode } from "react";
import { isProfilingEnabled } from "@/lib/debug/enabled";
import { logError, logProfileLine, logProfileTree, logRequestSummary } from "@/lib/debug/logger";
import {
  recordApiMetric,
  recordCacheMetric,
  recordDuplicateQuery,
  recordMemorySnapshot,
  recordSlowQuery,
} from "@/lib/debug/metrics";
import {
  addCategoryDuration,
  createRequestContext,
  enterSpan,
  exitSpan,
  generateRequestId,
  getRequestContext,
  getRequestTotalMs,
  recordCacheHit,
  recordCacheMiss,
  recordQueryFingerprint,
  runWithRequestContextAsync,
  type MetricCategory,
  type ProfileSpan,
} from "@/lib/debug/request-context";
import { recordOperationDuration } from "@/lib/debug/statistics";

export interface ProfileOptions {
  category?: MetricCategory;
  metadata?: Record<string, unknown>;
  /** Log even when nested (default: true) */
  log?: boolean;
}

function now(): number {
  return performance.now();
}

async function ensureRequestContext(route?: string) {
  const existing = getRequestContext();
  if (existing) return existing;

  let requestId = generateRequestId();
  try {
    const h = await headers();
    requestId = h.get("x-request-id") ?? requestId;
    route = route ?? h.get("x-pathname") ?? undefined;
  } catch {
    // headers() unavailable outside request scope
  }

  return createRequestContext(requestId, route);
}

function runProfile<T>(
  name: string,
  category: MetricCategory,
  fn: () => T,
  options?: ProfileOptions
): T {
  if (!isProfilingEnabled()) return fn();

  const ctx = getRequestContext();
  const depth = ctx ? ctx.depth + 1 : 0;
  const span: ProfileSpan = {
    name,
    category,
    durationMs: 0,
    depth,
    children: [],
    metadata: options?.metadata,
  };

  enterSpan(span);
  const start = now();

  try {
    const result = fn();
    return result;
  } catch (error) {
    logError(error, {
      requestId: ctx?.id,
      operation: name,
      durationMs: now() - start,
    });
    throw error;
  } finally {
    const durationMs = now() - start;
    span.durationMs = durationMs;
    exitSpan();
    addCategoryDuration(category, durationMs);
    recordOperationDuration(name, durationMs);
    recordMemorySnapshot();

    if (options?.log !== false) {
      logProfileLine(name, durationMs, depth, ctx?.id);
    }
  }
}

async function runProfileAsync<T>(
  name: string,
  category: MetricCategory,
  fn: () => Promise<T>,
  options?: ProfileOptions
): Promise<T> {
  if (!isProfilingEnabled()) return fn();

  const ctx = getRequestContext();
  const depth = ctx ? ctx.depth + 1 : 0;
  const span: ProfileSpan = {
    name,
    category,
    durationMs: 0,
    depth,
    children: [],
    metadata: options?.metadata,
  };

  enterSpan(span);
  const start = now();

  try {
    return await fn();
  } catch (error) {
    logError(error, {
      requestId: ctx?.id,
      operation: name,
      durationMs: now() - start,
    });
    throw error;
  } finally {
    const durationMs = now() - start;
    span.durationMs = durationMs;
    exitSpan();
    addCategoryDuration(category, durationMs);
    recordOperationDuration(name, durationMs);
    recordMemorySnapshot();

    if (options?.log !== false) {
      logProfileLine(name, durationMs, depth, ctx?.id);
    }
  }
}

export function finalizeRequest(): void {
  if (!isProfilingEnabled()) return;
  const ctx = getRequestContext();
  if (!ctx || ctx.finalized) return;
  ctx.finalized = true;

  logProfileTree(ctx.spans, ctx.id);
  logRequestSummary({
    requestId: ctx.id,
    totalMs: getRequestTotalMs(ctx),
    databaseMs: ctx.metrics.databaseMs,
    authenticationMs: ctx.metrics.authenticationMs,
    renderingMs: ctx.metrics.renderingMs,
    externalMs: ctx.metrics.externalMs,
    imagesMs: ctx.metrics.imagesMs,
    aiMs: ctx.metrics.aiMs,
    duplicateQueries: ctx.metrics.duplicateQueries,
  });
}

export function profile<T>(name: string, fn: () => T, options?: ProfileOptions): T {
  if (!isProfilingEnabled()) return fn();
  return runProfile(name, options?.category ?? "other", fn, options);
}

export function profileSync<T>(name: string, fn: () => T, options?: ProfileOptions): T {
  return profile(name, fn, options);
}

export async function profileAsync<T>(
  name: string,
  fn: () => Promise<T>,
  options?: ProfileOptions
): Promise<T> {
  if (!isProfilingEnabled()) return fn();
  return runProfileAsync(name, options?.category ?? "other", fn, options);
}

export function profileDb<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!isProfilingEnabled()) return fn();
  const key = `db:${name}`;
  recordQueryFingerprint(key);
  const ctx = getRequestContext();
  if (ctx && (ctx.queryFingerprints.get(key) ?? 0) > 1) {
    recordDuplicateQuery(key);
  }
  return runProfileAsync(key, "database", async () => {
    const start = now();
    const result = await fn();
    recordSlowQuery(key, now() - start);
    return result;
  });
}

export function profileAuth<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!isProfilingEnabled()) return fn();
  return runProfileAsync(name, "authentication", fn);
}

export function profileApi<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!isProfilingEnabled()) return fn();
  return runProfileAsync(`api:${name}`, "api", fn);
}

export function profileExternal<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!isProfilingEnabled()) return fn();
  return runProfileAsync(name, "external", fn);
}

export function profileCache<T>(
  name: string,
  layer: string,
  fn: () => T | Promise<T>,
  options?: { hit?: boolean }
): T | Promise<T> {
  if (!isProfilingEnabled()) return fn() as T | Promise<T>;

  if (options?.hit === true) {
    recordCacheHit();
    recordCacheMetric(layer, true);
  } else if (options?.hit === false) {
    recordCacheMiss();
    recordCacheMetric(layer, false);
  }

  const result = fn();
  if (result instanceof Promise) {
    return runProfileAsync(`cache:${name}`, "cache", () => result);
  }
  return runProfile(`cache:${name}`, "cache", () => result as T);
}

export function profileRender<T>(name: string, fn: () => T, options?: ProfileOptions): T {
  if (!isProfilingEnabled()) return fn();
  return runProfile(name, "rendering", fn, options);
}

export async function profileRenderAsync<T>(
  name: string,
  fn: () => Promise<T>,
  options?: ProfileOptions
): Promise<T> {
  if (!isProfilingEnabled()) return fn();
  return runProfileAsync(name, "rendering", fn, options);
}

export function profileImage<T>(name: string, fn: () => T): T {
  if (!isProfilingEnabled()) return fn();
  return runProfile(name, "images", fn);
}

export function profileR2<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!isProfilingEnabled()) return fn();
  return runProfileAsync(name, "r2", fn);
}

export function profileAI<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!isProfilingEnabled()) return fn();
  return runProfileAsync(name, "ai", fn);
}

export function profileComponent<T extends (...args: never[]) => Promise<unknown>>(
  name: string,
  Component: T
): T {
  if (!isProfilingEnabled()) return Component;

  const Wrapped = (async (...args: Parameters<T>) => {
    return profileRenderAsync(name, () => Component(...args) as Promise<unknown>);
  }) as T;

  return Wrapped;
}

export function profilePage<P extends Record<string, unknown>>(
  name: string,
  loader: (props: P) => Promise<ReactNode>
): (props: P) => Promise<ReactNode> {
  if (!isProfilingEnabled()) return loader;

  return async (props: P) => {
    const run = async () => {
      try {
        return await profileRenderAsync(name, () => loader(props));
      } finally {
        finalizeRequest();
      }
    };

    const existing = getRequestContext();
    if (existing) return run();

    const ctx = await ensureRequestContext(name);
    return runWithRequestContextAsync(ctx, run);
  };
}

export function profileLayout<P extends Record<string, unknown>>(
  name: string,
  loader: (props: P) => Promise<ReactNode>
): (props: P) => Promise<ReactNode> {
  if (!isProfilingEnabled()) return loader;

  return async (props: P) => {
    const existing = getRequestContext();
    const run = () => profileRenderAsync(name, () => loader(props));

    if (existing) return run();

    const ctx = await ensureRequestContext(name);
    return runWithRequestContextAsync(ctx, run);
  };
}

export function profileLoading<P extends Record<string, unknown>>(
  name: string,
  loader: (props: P) => ReactNode
): (props: P) => ReactNode {
  if (!isProfilingEnabled()) return loader;
  return (props: P) => profileRender(name, () => loader(props));
}

type ApiHandler<C = unknown> = (req: Request, context: C) => Promise<Response>;

export function profileApiRoute<C = unknown>(
  method: string,
  path: string,
  handler: ApiHandler<C>
): ApiHandler<C> {
  if (!isProfilingEnabled()) return handler;

  return async (req: Request, context: C) => {
    const requestId = req.headers.get("x-request-id") ?? generateRequestId();
    const ctx = createRequestContext(requestId, `${method} ${path}`);

    return runWithRequestContextAsync(ctx, async () => {
      const start = now();
      let status = 500;
      let payloadBytes: number | undefined;

      try {
        const response = await profileApi(`${method} ${path}`, async () => {
          const authStart = now();
          const result = await handler(req, context);
          logProfileLine("Handler", now() - authStart, 1, ctx.id);
          return result;
        });

        status = response.status;
        try {
          const clone = response.clone();
          const buf = await clone.arrayBuffer();
          payloadBytes = buf.byteLength;
          logProfileLine("Serialization", 0, 1, ctx.id);
        } catch {
          // ignore body size read errors
        }

        return response;
      } catch (error) {
        logError(error, {
          requestId: ctx.id,
          route: `${method} ${path}`,
          durationMs: now() - start,
        });
        throw error;
      } finally {
        recordApiMetric({
          method,
          path,
          status,
          durationMs: now() - start,
          payloadBytes,
        });
        finalizeRequest();
      }
    });
  };
}

export async function initRequestFromHeaders(route?: string): Promise<void> {
  if (!isProfilingEnabled()) return;
  if (getRequestContext()) return;
  await ensureRequestContext(route);
}
