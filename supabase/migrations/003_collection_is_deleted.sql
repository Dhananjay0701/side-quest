-- Soft delete for collections

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_collections_is_deleted ON collections(is_deleted);
