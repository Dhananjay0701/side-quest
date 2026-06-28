-- Profile roles for app-wide authorization (studio, collections, etc.)

CREATE TYPE profile_role AS ENUM ('owner', 'admin', 'editor', 'user');

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role profile_role NOT NULL DEFAULT 'user';

-- Migrate legacy studio_members grants (if migration 009 was applied)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'studio_members'
  ) THEN
    UPDATE profiles p
    SET role = 'admin'
    FROM studio_members sm
    WHERE p.id = sm.profile_id AND sm.role = 'admin';

    UPDATE profiles p
    SET role = 'editor'
    FROM studio_members sm
    WHERE p.id = sm.profile_id AND sm.role = 'editor' AND p.role = 'user';

    DROP TABLE studio_members;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
