-- Global place search: light/full tiers, OSM identity, autocomplete cache, enrichment jobs

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS osm_id text,
  ADD COLUMN IF NOT EXISTS places_api_id text,
  ADD COLUMN IF NOT EXISTS place_source text NOT NULL DEFAULT 'import',
  ADD COLUMN IF NOT EXISTS place_tier text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS save_count int NOT NULL DEFAULT 0;

ALTER TABLE places ALTER COLUMN google_maps_url DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_places_osm_id ON places(osm_id) WHERE osm_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_places_places_api_id ON places(places_api_id) WHERE places_api_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_address_trgm ON places USING gin(address gin_trgm_ops);

CREATE TABLE IF NOT EXISTS search_autocomplete_cache (
  cache_key text PRIMARY KEY,
  provider text NOT NULL,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_autocomplete_cache_expires ON search_autocomplete_cache(expires_at);

CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  trigger_reason text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_place_id ON enrichment_jobs(place_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);

CREATE TABLE IF NOT EXISTS user_search_history (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query text NOT NULL,
  selected_place_id uuid REFERENCES places(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, query, created_at)
);

CREATE TABLE IF NOT EXISTS search_rate_limits (
  rate_key text PRIMARY KEY,
  request_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Global place search: FTS + trigram, not gated by collection membership
CREATE OR REPLACE FUNCTION search_places_global(q text, result_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  latitude numeric,
  longitude numeric,
  cover_image_url text,
  place_tier text,
  place_source text,
  google_maps_url text,
  score float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    p.address,
    p.latitude,
    p.longitude,
    p.cover_image_url,
    p.place_tier,
    p.place_source,
    p.google_maps_url,
    (
      COALESCE(ts_rank(p.search_vector, websearch_to_tsquery('english', q)), 0)
      + GREATEST(similarity(p.name, q), similarity(COALESCE(p.address, ''), q))
    )::float AS score
  FROM places p
  WHERE
    length(trim(q)) > 0
    AND (
      p.search_vector @@ websearch_to_tsquery('english', q)
      OR similarity(p.name, q) > 0.25
      OR similarity(COALESCE(p.address, ''), q) > 0.25
    )
  ORDER BY score DESC
  LIMIT GREATEST(1, LEAST(result_limit, 50));
$$;
