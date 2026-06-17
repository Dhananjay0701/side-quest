<<<<<<< HEAD
# Random Sidequest

Personal travel memory and discovery app — browse Google Maps saved lists as premium cinematic collections.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn-style components
- **Backend:** Next.js API routes
- **Database:** Supabase Postgres
- **Enrichment:** Google Gemini `gemini-3.1-flash-lite` (on place detail view)
- **V0 Auth:** Anonymous session cookie (no login UI)

## Quick Start

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

### 3. Run Supabase migrations (required — tables are NOT auto-created)

Tables are **not** created automatically when you add env vars. Run the SQL files manually in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_search_vector.sql`

You only need to do this once per project.

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Import Format (CSV)

Export from Google Maps / Takeout as CSV with columns:

| Title | Note | URL | Tags | Comment |
|-------|------|-----|------|---------|

Example:

```csv
Title,Note,URL,Tags,Comment
Galgibaga Beach,,https://www.google.com/maps/place/...,, 
Cafe Tathastu Goa,,https://www.google.com/maps/place/...,, 
```

Upload via **Upload CSV** in the top navigation. Provide a collection name (defaults to filename).

Import pipeline:
1. Parses CSV → creates collection + places (fast, no AI)
2. Deduplicates by Google Place ID
3. **Gemini enrichment runs when you open a place** (category, tags, description)
4. Search works on place names immediately; tags/descriptions added after enrichment

## Project Structure

```
src/
  app/              # Pages + API routes
  components/       # UI components
  lib/
    db/queries/     # Supabase queries
    import/         # CSV parser + pipeline
    enrich/         # LLM prompts
    session/        # Anonymous user cookie
supabase/migrations/
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/collections` | All collections |
| GET | `/api/collections/:id` | Collection + filters |
| GET | `/api/places` | Filtered places |
| GET | `/api/places/recent` | Recently added |
| GET | `/api/places/:id` | Place detail |
| GET | `/api/search?q=` | Global search |
| POST | `/api/import` | Upload CSV |
| GET | `/api/import/:jobId` | Import job status |
| GET | `/api/me` | Current session user |

## Design

- Background: `#0F172A`
- Cards: `#1E293B`
- Primary: `#14B8A6` (teal)
- Secondary: `#F59E0B` (amber)

## V0 Notes

- **Explore tab** renders same as Collections (V1 will differ)
- **All data visible** to everyone (multi-user filtering comes later)
- **`search_enriched`** — Gemini runs on first place detail visit; sets category, tags, description
- **`is_public`** on collections reserved for future public discovery
=======
# side-quest
explore the new world
>>>>>>> f5e1a1b7eee8eb95bb83db4e4c1aea83fa8c2741
