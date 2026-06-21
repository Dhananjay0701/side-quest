# Cloudflare R2 Assets — Setup & Troubleshooting

Images live in R2 bucket **`random-sidequest-assets`**. They are **not** served from the Worker static `ASSETS` binding.

## Two different Cloudflare bindings (do not confuse these)

| Binding in wrangler | What it is | Your images? |
|---------------------|------------|----------------|
| **`ASSETS`** | OpenNext built JS/CSS from `.open-next/assets` | No |
| **`ASSETS_BUCKET`** | R2 bucket `random-sidequest-assets` | **Yes** |

The dashboard "Assets" / static asset binding is for the app bundle. Your photos must use the **R2 bucket binding** `ASSETS_BUCKET`.

---

## Step-by-step setup

### 1. Create R2 bucket & upload images

Bucket name: **`random-sidequest-assets`**

Object keys **must** include folder prefixes:

```
collections/bir.png
collections/cover-abc123.jpg
places/place-xyz789.jpg
avatars/avatar-user.jpg
```

Verify with CLI:

```bash
wrangler r2 object list random-sidequest-assets --prefix collections/
wrangler r2 object list random-sidequest-assets --prefix places/
```

Upload example:

```bash
wrangler r2 object put random-sidequest-assets/collections/bir.png --file=public/images_to_use/bir.png
```

### 2. Confirm wrangler.jsonc binding

```jsonc
"r2_buckets": [
  {
    "binding": "ASSETS_BUCKET",
    "bucket_name": "random-sidequest-assets"
  }
]
```

Redeploy after any wrangler change:

```bash
npm run deploy
```

### 3. Fix database paths (if imported before R2 migration)

Run in Supabase SQL Editor:

`supabase/migrations/006_r2_image_keys.sql`

This rewrites `/images_to_use/foo.jpg` → `collections/foo.jpg` and `place-*.jpg` → `places/place-*.jpg`.

### 4. Set environment variables **before build/deploy**

`NEXT_PUBLIC_*` values are **baked into the client at build time**. Change them → rebuild → redeploy.

**Option A — Worker CDN proxy (simplest, no public R2 URL needed)**

```bash
# .env.local (used during npm run deploy build)
NEXT_PUBLIC_APP_URL=https://random-sidequest.YOUR_SUBDOMAIN.workers.dev
# Leave NEXT_PUBLIC_ASSETS_BASE_URL empty
```

Images load as: `https://your-worker.dev/cdn/collections/bir.png`

**Option B — Direct R2 public URL (faster, optional)**

1. In Cloudflare dashboard → R2 → `random-sidequest-assets` → enable public access (r2.dev or custom domain)
2. Set:

```bash
NEXT_PUBLIC_ASSETS_BASE_URL=https://pub-XXXX.r2.dev
```

Images load as: `https://pub-XXXX.r2.dev/collections/bir.png`

Do **not** point `NEXT_PUBLIC_ASSETS_BASE_URL` at the Worker URL or the static ASSETS binding.

### 5. Set Worker secrets

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY
```

---

## Debug tools (use these when images break)

| URL | Purpose |
|-----|---------|
| **`/debug/assets`** | Visual page: env, DB paths, R2 listing, key checks |
| **`/api/debug/assets`** | Same data as JSON |
| **`/api/debug/assets?key=collections/bir.png`** | Check one R2 key |
| **`/api/debug/assets?stored=/images_to_use/bir.png`** | Test legacy DB → URL mapping |
| **`/cdn/collections/bir.png?debug=1`** | JSON error if R2 object missing |
| **`/cdn/collections/bir.png`** | Stream image from R2 |

### How to read the debug page

1. **ASSETS_BUCKET binding = no** → You're on `next dev` (local) or Worker missing R2 binding. Use `npm run preview` or deploy.
2. **DB path ≠ R2 key** → Run migration 006 or fix uploads to use `collections/` prefix.
3. **R2 key MISSING** → Upload object with exact key shown in debug (case-sensitive).
4. **URL points to localhost** → Rebuild with correct `NEXT_PUBLIC_APP_URL` and redeploy.
5. **resolutionMode = r2-public-url but 403/404** → Wrong `NEXT_PUBLIC_ASSETS_BASE_URL` or bucket not public.

---

## Common mistakes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Images work locally, broken on Worker | Built with `NEXT_PUBLIC_APP_URL=http://localhost:3000` | Set Worker URL, `npm run deploy` again |
| 503 "Assets bucket not configured" | Testing with `next dev` instead of Worker | Use `npm run preview` or deploy |
| 404 on /cdn/... | R2 key mismatch (file at root, not in `collections/`) | Re-upload with correct prefix |
| DB has `/images_to_use/x` | Legacy paths | Run `006_r2_image_keys.sql` |
| Used static ASSETS binding | Wrong binding type | Use `ASSETS_BUCKET` R2 binding |

---

## Local development

| Command | R2 binding | Images from |
|---------|------------|-------------|
| `npm run dev` | No | `public/images_to_use/{collections,places}/` |
| `npm run preview` | Yes (wrangler) | R2 via `/cdn/*` |
| Deployed Worker | Yes | R2 via `/cdn/*` or public URL |

For local `next dev`, mirror R2 layout:

```
public/images_to_use/collections/bir.png
public/images_to_use/places/place-xxx.jpg
```
