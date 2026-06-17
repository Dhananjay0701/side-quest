-- Generated tsvector columns for Supabase textSearch

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_text, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_places_search_vector ON places USING gin(search_vector);

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_collections_search_vector ON collections USING gin(search_vector);
