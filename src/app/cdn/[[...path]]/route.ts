import { getCloudflareContext } from "@opennextjs/cloudflare";
import { resolveAssetUrl } from "@/lib/images/assets";

const ALLOWED_PREFIXES = ["collections/", "places/", "avatars/"];

function jsonDebug(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const segments = (await params).path ?? [];
  const key = segments.join("/");

  if (!key || !ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    return debug
      ? jsonDebug(
          {
            error: "invalid_key",
            message: "Key must start with collections/, places/, or avatars/",
            received: key || null,
            example: "/cdn/collections/bir.png",
          },
          404
        )
      : new Response("Not found", { status: 404 });
  }

  try {
    const { env } = await getCloudflareContext();
    const bucket = (env as CloudflareEnv).ASSETS_BUCKET;

    if (!bucket) {
      return debug
        ? jsonDebug(
            {
              error: "binding_missing",
              message:
                "ASSETS_BUCKET is not bound. This is NOT the ASSETS static binding — add r2_buckets.ASSETS_BUCKET in wrangler.jsonc and redeploy.",
              key,
              hint: "Run on Worker (npm run deploy) or npm run preview — not plain next dev",
            },
            503
          )
        : new Response("Assets bucket not configured", { status: 503 });
    }

    const object = await bucket.get(key);

    if (!object) {
      const listed = await bucket.list({ prefix: key.split("/")[0] + "/", limit: 5 });
      return debug
        ? jsonDebug(
            {
              error: "not_found_in_r2",
              key,
              bucket: "random-sidequest-assets",
              hint: "Object key in R2 must match exactly (e.g. collections/bir.png not bir.png at bucket root)",
              sampleObjectsInPrefix: listed.objects.map((o) => o.key),
              resolvedPublicUrl: resolveAssetUrl(key),
            },
            404
          )
        : new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-Asset-Key", key);
    headers.set("X-Asset-Source", "r2:random-sidequest-assets");

    if (debug) {
      headers.set("X-Debug-Mode", "1");
      headers.set("X-Debug-Resolved-Url", resolveAssetUrl(key) ?? "");
    }

    return new Response(object.body, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return debug
      ? jsonDebug({ error: "fetch_failed", key, message }, 500)
      : new Response("Failed to load asset", { status: 500 });
  }
}

/** HEAD /cdn/collections/foo.jpg — quick existence check */
export async function HEAD(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const res = await GET(req, ctx);
  return new Response(null, {
    status: res.status,
    headers: res.headers,
  });
}
