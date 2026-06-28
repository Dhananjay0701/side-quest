# Random Sidequest

Personal travel memory and discovery app — browse Google Maps saved lists as premium cinematic collections.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn-style components
- **Hosting:** Cloudflare Workers via `@opennextjs/cloudflare`
- **Assets:** Cloudflare R2 (`random-sidequest-assets`)
- **Backend:** Next.js API routes on the edge
- **Database:** Supabase Postgres + Auth
- **Enrichment:** Google Gemini + Google Places Photos API

## Quick Start (local)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)

### 3. Run Supabase migrations

Run SQL files in order in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_search_vector.sql`
3. `supabase/migrations/003`–`005` (auth, profiles, RLS)
4. `supabase/migrations/006_r2_image_keys.sql` (after uploading images to R2)

See `supabase/AUTH_SETUP.md` for Google OAuth redirect URLs.

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Cloudflare Workers deploy

### R2 buckets

| Bucket | Purpose |
|--------|---------|
| `random-sidequest-opennext-cache` | OpenNext incremental cache (explore page DTO, ISR data) |
| `random-sidequest-assets` | App images (`collections/`, `places/`, `avatars/`) |

### OpenNext tag cache (required for `revalidateTag` after Studio publish)

Explore page data is cached in R2 between publishes. `revalidateTag` needs a D1 tag cache + queue on Cloudflare:

```bash
# 1. Create D1 database (copy database_id into wrangler.jsonc → d1_databases)
npx wrangler d1 create random-sidequest-next-tag-cache

# 2. Create revalidations table (local + remote)
npx wrangler d1 execute random-sidequest-next-tag-cache --local --file=scripts/setup-next-tag-cache-d1.sql
npx wrangler d1 execute random-sidequest-next-tag-cache --remote --file=scripts/setup-next-tag-cache-d1.sql

# 3. Deploy (DO migration for NEXT_CACHE_DO_QUEUE runs on first deploy)
npm run deploy
```

Publish also bumps the published revision version, which changes the cache key even before tag revalidation runs.

Upload existing images from `public/images_to_use/` into R2 with folder prefixes. See `supabase/R2_ASSETS.md`.

### Environment variables

**Build time** (embedded in client bundle):

```bash
NEXT_PUBLIC_APP_URL=https://random-sidequest.<your-subdomain>.workers.dev
NEXT_PUBLIC_ASSETS_BASE_URL=https://pub-xxxx.r2.dev   # optional; direct R2 CDN
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Worker secrets** (set via `wrangler secret put`):

```bash
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GOOGLE_MAPS_API_KEY
```

Copy `.dev.vars.example` to `.dev.vars` for local `wrangler preview`.

### Commands

```bash
npm run build      # Next.js build only
npm run preview    # OpenNext build + local Workers preview (port 8787)
npm run deploy     # Build + deploy to Cloudflare Workers
npm run cf-typegen # Regenerate cloudflare-env.d.ts from wrangler.jsonc
```

### Image URLs in production

- DB stores R2 keys like `collections/cover-abc.jpg`
- `resolveAssetUrl()` serves via `NEXT_PUBLIC_ASSETS_BASE_URL` or `/cdn/*` Worker route
- New uploads go straight to R2 via the `ASSETS_BUCKET` binding

## Import Format (CSV)

Export from Google Maps / Takeout as CSV with columns:

| Title | Note | URL | Tags | Comment |
|-------|------|-----|------|---------|

Upload via **Upload CSV** in the top navigation (requires sign-in).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/collections` | Collections (public + yours) |
| GET | `/api/collections/:id` | Collection + filters |
| GET | `/api/places` | Filtered places |
| GET | `/api/places/:id` | Place detail |
| GET | `/api/search?q=` | Global search |
| POST | `/api/import` | Upload CSV (auth) |
| GET | `/cdn/*` | Stream images from R2 |

## Design

- Background: `#0F172A`
- Cards: `#1E293B`
- Primary: `#14B8A6` (teal)
- Secondary: `#F59E0B` (amber)

