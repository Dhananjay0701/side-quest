-- OpenNext D1 tag cache (required for revalidateTag on Cloudflare Workers)
-- Run after: npx wrangler d1 create random-sidequest-next-tag-cache
--
-- Local preview:
--   npx wrangler d1 execute random-sidequest-next-tag-cache --local --file=scripts/setup-next-tag-cache-d1.sql
-- Production:
--   npx wrangler d1 execute random-sidequest-next-tag-cache --remote --file=scripts/setup-next-tag-cache-d1.sql

CREATE TABLE IF NOT EXISTS revalidations (
  tag TEXT NOT NULL,
  revalidatedAt INTEGER NOT NULL,
  UNIQUE(tag) ON CONFLICT REPLACE
);
