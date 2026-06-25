import { isProfilingEnabled } from "@/lib/debug/enabled";
import type { ProfileSpan } from "@/lib/debug/request-context";

const LABEL_WIDTH = 28;

function padLabel(label: string): string {
  const dots = Math.max(1, LABEL_WIDTH - label.length);
  return `${label}${".".repeat(dots)}`;
}

function formatMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}

function prefix(requestId?: string): string {
  return requestId ? `[${requestId}] ` : "";
}

export function logProfileLine(
  label: string,
  durationMs: number,
  depth = 0,
  requestId?: string
): void {
  if (!isProfilingEnabled()) return;
  const indent = depth > 0 ? `${"│   ".repeat(depth - 1)}├── ` : "";
  const line = `${prefix(requestId)}${indent}${padLabel(label)}${formatMs(durationMs)}`;
  console.log(line);
}

export function logProfileTree(spans: ProfileSpan[], requestId?: string, depth = 0): void {
  if (!isProfilingEnabled()) return;
  for (const span of spans) {
    logProfileLine(span.name, span.durationMs, depth, requestId);
    if (span.children.length > 0) {
      logProfileTree(span.children, requestId, depth + 1);
    }
  }
}

export function logRequestSummary(args: {
  requestId: string;
  totalMs: number;
  databaseMs: number;
  authenticationMs: number;
  renderingMs: number;
  externalMs: number;
  imagesMs: number;
  aiMs: number;
  duplicateQueries: string[];
}): void {
  if (!isProfilingEnabled()) return;

  const lines = [
    "",
    "==================================",
    "",
    `Request: ${args.requestId}`,
    "",
    padLabel("Total Time") + formatMs(args.totalMs),
    padLabel("Database") + formatMs(args.databaseMs),
    padLabel("Authentication") + formatMs(args.authenticationMs),
    padLabel("Rendering") + formatMs(args.renderingMs),
    padLabel("External APIs") + formatMs(args.externalMs),
    padLabel("Images") + formatMs(args.imagesMs),
    padLabel("AI") + formatMs(args.aiMs),
    "",
    "==================================",
    "",
  ];

  console.log(lines.join("\n"));

  if (args.duplicateQueries.length > 0) {
    console.warn(
      `[${args.requestId}] Duplicate queries in request: ${args.duplicateQueries.join(", ")}`
    );
  }
}

export function logError(error: unknown, meta: {
  requestId?: string;
  route?: string;
  component?: string;
  operation?: string;
  durationMs?: number;
}): void {
  if (!isProfilingEnabled()) return;

  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    [
      `[${meta.requestId ?? "no-request"}] ERROR`,
      meta.route ? `route: ${meta.route}` : null,
      meta.component ? `component: ${meta.component}` : null,
      meta.operation ? `operation: ${meta.operation}` : null,
      meta.durationMs != null ? `duration: ${formatMs(meta.durationMs)}` : null,
      err.message,
      err.stack,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

export function logStatisticBlock(name: string, stats: {
  count: number;
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}): void {
  if (!isProfilingEnabled()) return;

  console.log(
    [
      "",
      name,
      padLabel("Average") + formatMs(stats.average),
      padLabel("Median") + formatMs(stats.median),
      padLabel("P95") + formatMs(stats.p95),
      padLabel("P99") + formatMs(stats.p99),
      padLabel("Max") + formatMs(stats.max),
      padLabel("Calls") + String(stats.count),
      "",
    ].join("\n")
  );
}
