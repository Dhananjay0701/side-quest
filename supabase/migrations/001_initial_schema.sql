-- Random Sidequest initial schema

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Categories (fixed taxonomy)
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO categories (slug, name, icon, sort_order) VALUES
  ('restaurant', 'Restaurant', 'utensils', 1),
  ('cafe', 'Cafe', 'coffee', 2),
  ('bar', 'Bar', 'wine', 3),
  ('beach', 'Beach', 'waves', 4),
  ('nature', 'Nature', 'trees', 5),
  ('viewpoint', 'Viewpoint', 'mountain', 6),
  ('hotel', 'Hotel', 'bed', 7),
  ('activity', 'Activity', 'compass', 8),
  ('other', 'Other', 'map-pin', 99);

-- Users (anonymous session in V0)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  session_token text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_session_token ON users(session_token);

-- Collections
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id text,
  name text NOT NULL,
  description text,
  cover_image_url text,
  cover_source text NOT NULL DEFAULT 'collage',
  place_count int NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'google_takeout',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_is_public ON collections(is_public);

-- Places
CREATE TABLE places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  google_place_id text,
  google_maps_url text NOT NULL,
  name text NOT NULL,
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  rating numeric(2, 1),
  cover_image_url text,
  category_id uuid REFERENCES categories(id),
  likely_audience text,
  likely_vibe text,
  category_source text DEFAULT 'llm',
  category_confidence numeric(3, 2),
  import_notes text,
  search_text text,
  search_enriched boolean NOT NULL DEFAULT false,
  enrichment_status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_places_google_place_id ON places(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX idx_places_category_id ON places(category_id);
CREATE INDEX idx_places_enrichment_status ON places(enrichment_status);
CREATE INDEX idx_places_search_text_fts ON places USING gin(to_tsvector('english', coalesce(search_text, '')));
CREATE INDEX idx_places_name_trgm ON places USING gin(name gin_trgm_ops);

-- Tags
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  tag_type text NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Place tags junction
CREATE TABLE place_tags (
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'llm',
  confidence numeric(3, 2),
  PRIMARY KEY (place_id, tag_id)
);

CREATE INDEX idx_place_tags_tag_id ON place_tags(tag_id);

-- Collection places junction
CREATE TABLE collection_places (
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  sort_order int,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, place_id)
);

CREATE INDEX idx_collection_places_place_id ON collection_places(place_id);

-- Place descriptions
CREATE TABLE place_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid UNIQUE NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  short_text text,
  long_text text,
  source text NOT NULL DEFAULT 'llm_import',
  model text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Import jobs
CREATE TABLE import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  file_name text,
  file_size_bytes int,
  stats jsonb NOT NULL DEFAULT '{}',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE import_job_places (
  import_job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  action text NOT NULL,
  PRIMARY KEY (import_job_id, place_id)
);

-- Maintain collection place_count
CREATE OR REPLACE FUNCTION update_collection_place_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collections SET place_count = place_count + 1, updated_at = now()
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collections SET place_count = GREATEST(place_count - 1, 0), updated_at = now()
    WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_collection_place_count
AFTER INSERT OR DELETE ON collection_places
FOR EACH ROW EXECUTE FUNCTION update_collection_place_count();

-- FTS on collections
CREATE INDEX idx_collections_search_fts ON collections
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
