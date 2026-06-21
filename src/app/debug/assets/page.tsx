import Link from "next/link";
import {
  checkR2Key,
  describeAssetResolution,
  getAssetEnvConfig,
  getDbImageSamples,
  getRuntimeAssetInfo,
  listR2Sample,
} from "@/lib/images/asset-debug";

export const dynamic = "force-dynamic";

export default async function DebugAssetsPage() {
  const [config, runtime, dbSamples, collectionsList, placesList] = await Promise.all([
    Promise.resolve(getAssetEnvConfig()),
    getRuntimeAssetInfo(),
    getDbImageSamples(),
    listR2Sample("collections/"),
    listR2Sample("places/"),
  ]);

  const probeKeys = [
    "collections/bir.png",
    ...dbSamples.collections.map((c) => c.r2Key).filter(Boolean),
    ...dbSamples.places.map((p) => p.r2Key).filter(Boolean),
  ] as string[];

  const uniqueKeys = [...new Set(probeKeys)].slice(0, 12);
  const r2Checks = await Promise.all(uniqueKeys.map((key) => checkR2Key(key)));

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 text-sm text-foreground">
      <div>
        <h1 className="text-2xl font-semibold">Image / R2 debug</h1>
        <p className="mt-2 text-muted">
          Compare what is in Supabase vs what keys exist in R2 vs what URLs the app generates.
        </p>
        <p className="mt-1">
          JSON API:{" "}
          <Link href="/api/debug/assets" className="text-primary underline">
            /api/debug/assets
          </Link>
        </p>
      </div>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="font-medium">Environment</h2>
        <dl className="mt-3 grid gap-2 font-mono text-xs">
          <div>
            <dt className="text-muted">resolutionMode</dt>
            <dd>{config.resolutionMode}</dd>
          </div>
          <div>
            <dt className="text-muted">NEXT_PUBLIC_APP_URL</dt>
            <dd>{config.NEXT_PUBLIC_APP_URL ?? "(not set)"}</dd>
          </div>
          <div>
            <dt className="text-muted">NEXT_PUBLIC_ASSETS_BASE_URL</dt>
            <dd>{config.NEXT_PUBLIC_ASSETS_BASE_URL ?? "(not set — using /cdn proxy)"}</dd>
          </div>
          <div>
            <dt className="text-muted">runtime</dt>
            <dd>{runtime.runtime}</dd>
          </div>
          <div>
            <dt className="text-muted">ASSETS_BUCKET binding</dt>
            <dd>{runtime.bindings.ASSETS_BUCKET ? "yes" : "no"}</dd>
          </div>
          <div>
            <dt className="text-muted">ASSETS static binding (OpenNext JS/CSS)</dt>
            <dd>{runtime.bindings.ASSETS ? "yes" : "no"}</dd>
          </div>
        </dl>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-muted">
          {config.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="font-medium">R2 bucket listing (sample)</h2>
        <p className="mt-1 text-muted">Bucket: random-sidequest-assets via ASSETS_BUCKET</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted">collections/</h3>
            <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2 text-xs">
              {collectionsList.objects.length
                ? collectionsList.objects.join("\n")
                : collectionsList.bucketAvailable
                  ? "(empty — upload to collections/ prefix)"
                  : "(binding unavailable — run on Worker or wrangler preview)"}
            </pre>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted">places/</h3>
            <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2 text-xs">
              {placesList.objects.length
                ? placesList.objects.join("\n")
                : placesList.bucketAvailable
                  ? "(empty)"
                  : "(binding unavailable)"}
            </pre>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="font-medium">R2 key checks</h2>
        <div className="mt-3 space-y-3">
          {r2Checks.map((check) => (
            <div key={check.key} className="rounded border border-border/40 p-3 font-mono text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span>{check.key}</span>
                <span
                  className={
                    check.exists
                      ? "rounded bg-teal-500/20 px-2 py-0.5 text-teal-300"
                      : "rounded bg-red-500/20 px-2 py-0.5 text-red-300"
                  }
                >
                  {check.exists ? "EXISTS in R2" : "MISSING in R2"}
                </span>
              </div>
              {"error" in check && check.error && (
                <p className="mt-1 text-red-300">{check.error}</p>
              )}
              <p className="mt-2 break-all text-muted">
                URL: {describeAssetResolution(check.key).resolvedUrl}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="font-medium">Database paths → resolved URLs</h2>
        <div className="mt-3 space-y-4">
          <div>
            <h3 className="text-xs uppercase text-muted">Collections</h3>
            {dbSamples.collections.length === 0 ? (
              <p className="mt-1 text-muted">No collection cover_image_url values in DB.</p>
            ) : (
              dbSamples.collections.map((row) => (
                <AssetRow key={row.id} label={row.name} data={row} />
              ))
            )}
          </div>
          <div>
            <h3 className="text-xs uppercase text-muted">Places</h3>
            {dbSamples.places.length === 0 ? (
              <p className="mt-1 text-muted">No place cover_image_url values in DB.</p>
            ) : (
              dbSamples.places.map((row) => (
                <AssetRow key={row.id} label={row.name} data={row} />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-muted">
        <h2 className="font-medium text-amber-200">Quick test URLs</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <Link href="/cdn/collections/bir.png?debug=1" className="text-primary underline">
              /cdn/collections/bir.png?debug=1
            </Link>{" "}
            — Worker → R2 proxy
          </li>
          <li>
            <Link href="/api/debug/assets?key=collections/bir.png" className="text-primary underline">
              /api/debug/assets?key=collections/bir.png
            </Link>
          </li>
          <li>
            <Link
              href="/api/debug/assets?stored=/images_to_use/bir.png"
              className="text-primary underline"
            >
              /api/debug/assets?stored=/images_to_use/bir.png
            </Link>{" "}
            — legacy path mapping
          </li>
        </ul>
      </section>
    </main>
  );
}

function AssetRow({
  label,
  data,
}: {
  label: string;
  data: ReturnType<typeof describeAssetResolution> & { id: string };
}) {
  return (
    <div className="mt-2 rounded border border-border/40 p-3 font-mono text-xs">
      <p className="font-sans text-sm text-foreground">{label}</p>
      <p className="mt-1">
        <span className="text-muted">DB: </span>
        {data.stored ?? "null"}
      </p>
      <p>
        <span className="text-muted">R2 key: </span>
        {data.r2Key ?? "—"}
      </p>
      <p className="break-all">
        <span className="text-muted">URL: </span>
        {data.resolvedUrl ?? "—"}
      </p>
      {data.resolvedUrl && (
        <p className="mt-2">
          <Link href={data.resolvedUrl} className="text-primary underline" target="_blank">
            Open image
          </Link>
          {" · "}
          {data.r2Key && (
            <Link href={`/cdn/${data.r2Key}?debug=1`} className="text-primary underline">
              Test /cdn proxy
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
