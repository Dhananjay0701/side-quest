"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IMAGE_CACHE_VERSION,
  imageCache,
  type ImageCacheStats,
} from "@/lib/images/cache";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export default function DebugImagesPage() {
  const [stats, setStats] = useState<ImageCacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await imageCache.getStats();
    setStats(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  async function handleClear() {
    setAction("clearing…");
    await imageCache.clear();
    await refresh();
    setAction(null);
  }

  async function handleRefreshCache() {
    setAction("refreshing…");
    await refresh();
    setAction(null);
  }

  const sw = stats?.serviceWorker;
  const client = stats?.client;
  const swHitRate =
    sw && sw.serviceWorkerHits + sw.networkHits > 0
      ? sw.serviceWorkerHits / (sw.serviceWorkerHits + sw.networkHits)
      : 0;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 text-sm">
      <div>
        <h1 className="text-2xl font-semibold">Image cache debug</h1>
        <p className="mt-2 text-muted">
          Service Worker LRU cache · 20 MB / 40 images max · developer only
        </p>
        <p className="mt-1">
          <Link href="/debug/assets" className="text-primary underline">
            R2 asset debug
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          Refresh stats
        </Button>
        <Button variant="outline" size="sm" onClick={() => void handleRefreshCache()}>
          Reload metrics
        </Button>
        <Button variant="outline" size="sm" onClick={() => void handleClear()}>
          Clear image cache
        </Button>
        {action && <span className="self-center text-xs text-muted">{action}</span>}
      </div>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="font-medium">Cache overview</h2>
        <dl className="mt-3 grid gap-2 font-mono text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted">Cache version</dt>
            <dd>{IMAGE_CACHE_VERSION}</dd>
          </div>
          <div>
            <dt className="text-muted">Cache name</dt>
            <dd>{stats?.cacheName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">SW cache size</dt>
            <dd>{sw ? formatBytes(sw.totalBytes) : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Images cached (SW)</dt>
            <dd>{sw?.imageCount ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Memory warmed</dt>
            <dd>{stats?.memoryWarmed ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Registered URLs</dt>
            <dd>{stats?.registeredUrls ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Oldest cached</dt>
            <dd>{formatTime(sw?.oldestCachedAt ?? null)}</dd>
          </div>
          <div>
            <dt className="text-muted">Newest cached</dt>
            <dd>{formatTime(sw?.newestCachedAt ?? null)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="font-medium">Hit rates & timing</h2>
        <dl className="mt-3 grid gap-2 font-mono text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted">Client cache hit rate</dt>
            <dd>{((stats?.hitRate ?? 0) * 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt className="text-muted">SW hit rate</dt>
            <dd>{(swHitRate * 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt className="text-muted">SW hits</dt>
            <dd>{sw?.serviceWorkerHits ?? client?.serviceWorkerHits ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted">Network hits</dt>
            <dd>{sw?.networkHits ?? client?.networkRequests ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted">Browser cache hits</dt>
            <dd>{client?.browserCacheHits ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted">Images preloaded</dt>
            <dd>{client?.preloaded ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted">Avg load time</dt>
            <dd>{(stats?.averageLoadMs ?? 0).toFixed(0)} ms</dd>
          </div>
          <div>
            <dt className="text-muted">Avg decode time</dt>
            <dd>{(stats?.averageDecodeMs ?? 0).toFixed(0)} ms</dd>
          </div>
        </dl>
      </section>

      {client?.largest && (
        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h2 className="font-medium">Largest image</h2>
          <p className="mt-2 break-all font-mono text-xs">{client.largest.url}</p>
          <p className="mt-1 text-muted">
            {client.largest.bytes ? formatBytes(client.largest.bytes) : "—"} · load{" "}
            {client.largest.loadMs.toFixed(0)} ms
          </p>
        </section>
      )}

      {client?.slowest && (
        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h2 className="font-medium">Slowest image</h2>
          <p className="mt-2 break-all font-mono text-xs">{client.slowest.url}</p>
          <p className="mt-1 text-muted">
            load {client.slowest.loadMs.toFixed(0)} ms · decode {client.slowest.decodeMs.toFixed(0)} ms
          </p>
        </section>
      )}

      {sw && sw.entries.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h2 className="font-medium">Top cached entries (by size)</h2>
          <div className="mt-3 space-y-2">
            {sw.entries.map((entry) => (
              <div
                key={entry.url}
                className="rounded border border-border/40 p-2 font-mono text-xs"
              >
                <p className="break-all">{entry.url}</p>
                <p className="mt-1 text-muted">
                  {formatBytes(entry.size)} · {entry.tier} · last{" "}
                  {formatTime(entry.lastAccess)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
