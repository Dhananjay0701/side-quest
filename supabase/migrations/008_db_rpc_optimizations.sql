-- Single-round-trip RPCs for hot paths (recent places, collection filters)

-- Recent places for a user's collections (replaces 3 sequential queries)
CREATE OR REPLACE FUNCTION public.get_recent_places_for_user(
  p_user_id uuid,
  p_limit int DEFAULT 12
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(place_json ORDER BY created_at DESC NULLS LAST),
    '[]'::jsonb
  )
  FROM (
    SELECT
      p.created_at,
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'address', p.address,
        'rating', p.rating,
        'cover_image_url', p.cover_image_url,
        'google_maps_url', p.google_maps_url,
        'likely_audience', p.likely_audience,
        'likely_vibe', p.likely_vibe,
        'latitude', p.latitude,
        'longitude', p.longitude,
        'metadata', p.metadata,
        'category_slug', cat.slug,
        'category_name', cat.name,
        'short_text', pd.short_text,
        'collection_name', (
          SELECT c.name
          FROM collection_places cp2
          JOIN collections c ON c.id = cp2.collection_id
          WHERE cp2.place_id = p.id
            AND c.user_id = p_user_id
            AND c.is_deleted = false
          LIMIT 1
        ),
        'tags', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object('slug', t.slug, 'name', t.name)
              ORDER BY t.name
            )
            FROM place_tags pt
            JOIN tags t ON t.id = pt.tag_id
            WHERE pt.place_id = p.id
          ),
          '[]'::jsonb
        )
      ) AS place_json
    FROM places p
    LEFT JOIN categories cat ON cat.id = p.category_id
    LEFT JOIN place_descriptions pd ON pd.place_id = p.id
    WHERE EXISTS (
      SELECT 1
      FROM collection_places cp
      JOIN collections c ON c.id = cp.collection_id
      WHERE cp.place_id = p.id
        AND c.user_id = p_user_id
        AND c.is_deleted = false
    )
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT GREATEST(p_limit, 0)
  ) recent;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_places_for_user(uuid, int) TO service_role;

-- Collection filter facet counts (replaces 3 sequential queries)
CREATE OR REPLACE FUNCTION public.get_collection_filter_counts(
  p_collection_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH place_ids AS (
    SELECT place_id
    FROM collection_places
    WHERE collection_id = p_collection_id
  ),
  cat_counts AS (
    SELECT cat.slug, cat.name, COUNT(*)::int AS count
    FROM places p
    JOIN categories cat ON cat.id = p.category_id
    WHERE p.id IN (SELECT place_id FROM place_ids)
    GROUP BY cat.slug, cat.name
  ),
  tag_counts AS (
    SELECT t.slug, t.name, COUNT(*)::int AS count
    FROM place_tags pt
    JOIN tags t ON t.id = pt.tag_id
    WHERE pt.place_id IN (SELECT place_id FROM place_ids)
    GROUP BY t.slug, t.name
  )
  SELECT jsonb_build_object(
    'categories',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('slug', slug, 'name', name, 'count', count)
          ORDER BY count DESC
        )
        FROM cat_counts
      ),
      '[]'::jsonb
    ),
    'tags',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('slug', slug, 'name', name, 'count', count)
          ORDER BY count DESC
        )
        FROM tag_counts
      ),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_collection_filter_counts(uuid) TO service_role;
