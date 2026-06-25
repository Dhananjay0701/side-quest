-- Query performance: missing FK indexes + batched top-tags RPC

-- collection_places: queried heavily by collection_id
CREATE INDEX IF NOT EXISTS idx_collection_places_collection_id
  ON collection_places(collection_id);

-- place_tags: queried heavily by place_id
CREATE INDEX IF NOT EXISTS idx_place_tags_place_id
  ON place_tags(place_id);

-- collections: owner listing sorted by updated_at
CREATE INDEX IF NOT EXISTS idx_collections_user_active
  ON collections(user_id, updated_at DESC)
  WHERE is_deleted = false;

-- places: recent listing
CREATE INDEX IF NOT EXISTS idx_places_created_at
  ON places(created_at DESC);

-- profiles: auth lookup (UNIQUE on auth_user_id already indexes, explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id
  ON profiles(auth_user_id);

-- Top tags for many collections in one round-trip
CREATE OR REPLACE FUNCTION public.get_collections_top_tags(
  p_collection_ids uuid[],
  p_limit_per_collection int DEFAULT 4
)
RETURNS TABLE(collection_id uuid, tag_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tag_counts AS (
    SELECT
      cp.collection_id,
      t.name AS tag_name,
      COUNT(*)::bigint AS cnt
    FROM collection_places cp
    JOIN place_tags pt ON pt.place_id = cp.place_id
    JOIN tags t ON t.id = pt.tag_id
    WHERE cp.collection_id = ANY(p_collection_ids)
    GROUP BY cp.collection_id, t.name
  ),
  ranked AS (
    SELECT
      collection_id,
      tag_name,
      ROW_NUMBER() OVER (
        PARTITION BY collection_id
        ORDER BY cnt DESC, tag_name ASC
      ) AS rn
    FROM tag_counts
  )
  SELECT collection_id, tag_name
  FROM ranked
  WHERE rn <= GREATEST(p_limit_per_collection, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_collections_top_tags(uuid[], int) TO service_role;
