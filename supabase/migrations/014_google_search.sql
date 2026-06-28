-- Google-first search: popularity scoring + enriched_at / photo_status

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS popularity_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

-- Backfill popularity from existing save counts (+2 per save)
UPDATE places
SET popularity_score = GREATEST(popularity_score, COALESCE(save_count, 0) * 2)
WHERE popularity_score = 0 AND COALESCE(save_count, 0) > 0;

UPDATE places
SET photo_status = 'ready'
WHERE cover_image_url IS NOT NULL AND photo_status = 'none';

UPDATE places
SET enriched_at = updated_at
WHERE place_tier = 'full' AND search_enriched = true AND enriched_at IS NULL;

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
      + (ln(GREATEST(p.popularity_score, p.save_count * 2, 1)::float) * 0.15)
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
