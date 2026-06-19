# Cloudflare R2 Assets

Images are stored in the **`random-sidequest-assets`** R2 bucket (not on the Worker filesystem).

## Folder structure

| R2 prefix | Contents |
|-----------|----------|
| `collections/` | Collection cover images (`cover-*.jpg`, `bir.png`) |
| `places/` | Google Places photos (`place-*.jpg`) |
| `avatars/` | User avatar uploads (future) |

## How URLs work

Stored in DB as R2 keys (e.g. `collections/cover-123.jpg`) or legacy `/images_to_use/...` paths.

At display time, `resolveAssetUrl()` converts to a public URL:

1. **`NEXT_PUBLIC_ASSETS_BASE_URL`** set → `https://your-cdn/collections/foo.jpg` (preferred for production)
2. **`NEXT_PUBLIC_APP_URL` only** → `https://your-worker.dev/cdn/collections/foo.jpg` (Worker streams from R2)
3. **Local dev** → `/images_to_use/` fallback (filesystem)

## Wrangler binding

```jsonc
{
  "binding": "ASSETS_BUCKET",
  "bucket_name": "random-sidequest-assets"
}
```

## Migrating existing images

Upload `public/images_to_use/` contents to R2:

```bash
# Collection covers + default bir.png → collections/
wrangler r2 object put random-sidequest-assets/collections/bir.png --file=public/images_to_use/bir.png

# Place photos → places/
wrangler r2 object put random-sidequest-assets/places/place-xxx.jpg --file=public/images_to_use/place-xxx.jpg
```

Or bulk upload via Cloudflare dashboard.

## Production env vars (set before `npm run deploy`)

```bash
NEXT_PUBLIC_APP_URL=https://random-sidequest.your-subdomain.workers.dev
NEXT_PUBLIC_ASSETS_BASE_URL=https://pub-xxxx.r2.dev   # if bucket has public access
```

Also set all Supabase/Gemini/Google keys as Worker secrets:

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY
```

Public vars (`NEXT_PUBLIC_*`) must be present at **build time** for Next.js embedding.
