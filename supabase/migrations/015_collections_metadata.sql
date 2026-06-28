-- Optional metadata on user collections (e.g. user-defined tags at creation time)

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
