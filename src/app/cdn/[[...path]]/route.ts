import { getCloudflareContext } from "@opennextjs/cloudflare";

const ALLOWED_PREFIXES = ["collections/", "places/", "avatars/"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const segments = (await params).path ?? [];
  const key = segments.join("/");

  if (!key || !ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { env } = await getCloudflareContext();
    const bucket = (env as CloudflareEnv).ASSETS_BUCKET;
    if (!bucket) {
      return new Response("Assets bucket not configured", { status: 503 });
    }

    const object = await bucket.get(key);
    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(object.body, { headers });
  } catch {
    return new Response("Failed to load asset", { status: 500 });
  }
}
