-- Supabase Auth: profiles table, visibility, and row-level security
-- Run after enabling Email + Google providers in Supabase Dashboard → Authentication

-- ── 1. Rename users → profiles (keeps existing FK references) ──────────────
ALTER TABLE users RENAME TO profiles;

ALTER INDEX idx_users_session_token RENAME TO idx_profiles_session_token;

-- ── 2. Link profiles to auth.users ─────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS email text;

-- Legacy anonymous sessions — nullable after auth migration
ALTER TABLE profiles ALTER COLUMN session_token DROP NOT NULL;

-- Backfill username for any existing rows
UPDATE profiles
SET username = 'traveler' || substr(replace(id::text, '-', ''), 1, 8)
WHERE username IS NULL;

ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;

-- ── 3. Auto-generate username on insert/update ───────────────────────────────
CREATE OR REPLACE FUNCTION generate_profile_username()
RETURNS trigger AS $$
DECLARE
  base text;
  candidate text;
  suffix int := 0;
BEGIN
  IF NEW.username IS NOT NULL AND NEW.username <> '' THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    base := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  ELSE
    base := 'traveler';
  END IF;

  IF base = '' OR length(base) < 3 THEN
    base := 'traveler';
  END IF;

  base := left(base, 20);
  candidate := base;

  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = candidate AND id IS DISTINCT FROM NEW.id) LOOP
    suffix := suffix + 1;
    candidate := base || suffix::text;
  END LOOP;

  NEW.username := candidate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_username ON profiles;
CREATE TRIGGER trg_profiles_username
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION generate_profile_username();

-- ── 4. Create profile when auth.users row is created ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'Traveler'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ── 5. Helper: profile id for current auth user ────────────────────────────
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid()
$$;

-- ── 6. Collection visibility index (private = is_public false) ─────────────
CREATE INDEX IF NOT EXISTS idx_collections_public_not_deleted
  ON collections(is_public, is_deleted)
  WHERE is_deleted = false;

-- ── 7. Enable RLS ───────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- ── 8. Profiles policies ────────────────────────────────────────────────────
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY profiles_select_public_owners ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.user_id = profiles.id
        AND c.is_public = true
        AND c.is_deleted = false
    )
  );

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth_user_id = auth.uid());

-- ── 9. Collections policies ───────────────────────────────────────────────────
-- Private: only owner sees. Public: everyone sees (when not deleted).
CREATE POLICY collections_select_own ON collections
  FOR SELECT USING (user_id = auth_profile_id() AND is_deleted = false);

CREATE POLICY collections_select_public ON collections
  FOR SELECT USING (is_public = true AND is_deleted = false);

CREATE POLICY collections_insert_own ON collections
  FOR INSERT WITH CHECK (user_id = auth_profile_id());

CREATE POLICY collections_update_own ON collections
  FOR UPDATE USING (user_id = auth_profile_id());

CREATE POLICY collections_delete_own ON collections
  FOR DELETE USING (user_id = auth_profile_id());

-- ── 10. Places policies ─────────────────────────────────────────────────────
CREATE POLICY places_select_accessible ON places
  FOR SELECT USING (
    user_id = auth_profile_id()
    OR EXISTS (
      SELECT 1 FROM collection_places cp
      JOIN collections c ON c.id = cp.collection_id
      WHERE cp.place_id = places.id
        AND c.is_deleted = false
        AND (c.user_id = auth_profile_id() OR c.is_public = true)
    )
  );

CREATE POLICY places_insert_own ON places
  FOR INSERT WITH CHECK (user_id = auth_profile_id() OR user_id IS NULL);

CREATE POLICY places_update_own ON places
  FOR UPDATE USING (user_id = auth_profile_id());

-- ── 11. Junction / related tables ───────────────────────────────────────────
CREATE POLICY collection_places_select ON collection_places
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_places.collection_id
        AND c.is_deleted = false
        AND (c.user_id = auth_profile_id() OR c.is_public = true)
    )
  );

CREATE POLICY collection_places_insert_own ON collection_places
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_places.collection_id
        AND c.user_id = auth_profile_id()
    )
  );

CREATE POLICY place_descriptions_select ON place_descriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM places p
      WHERE p.id = place_descriptions.place_id
        AND (
          p.user_id = auth_profile_id()
          OR EXISTS (
            SELECT 1 FROM collection_places cp
            JOIN collections c ON c.id = cp.collection_id
            WHERE cp.place_id = p.id
              AND c.is_deleted = false
              AND (c.user_id = auth_profile_id() OR c.is_public = true)
          )
        )
    )
  );

CREATE POLICY place_tags_select ON place_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM places p
      WHERE p.id = place_tags.place_id
        AND (
          p.user_id = auth_profile_id()
          OR EXISTS (
            SELECT 1 FROM collection_places cp
            JOIN collections c ON c.id = cp.collection_id
            WHERE cp.place_id = p.id
              AND c.is_deleted = false
              AND (c.user_id = auth_profile_id() OR c.is_public = true)
          )
        )
    )
  );

CREATE POLICY import_jobs_select_own ON import_jobs
  FOR SELECT USING (user_id = auth_profile_id());

CREATE POLICY import_jobs_insert_own ON import_jobs
  FOR INSERT WITH CHECK (user_id = auth_profile_id());

CREATE POLICY import_jobs_update_own ON import_jobs
  FOR UPDATE USING (user_id = auth_profile_id());
