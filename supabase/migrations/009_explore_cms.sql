-- Editorial CMS: reusable pages, draft/publish workflow, sections, audit trail

-- ── Pages (explore, city landings, campaigns, etc.) ─────────────────────────
CREATE TABLE cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cms_pages_slug ON cms_pages(slug);

-- ── Revisions (draft / published / archived) ──────────────────────────────
CREATE TABLE cms_page_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  hero jsonb NOT NULL DEFAULT '{}',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  published_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (page_id, version_number)
);

CREATE UNIQUE INDEX cms_page_revisions_one_draft
  ON cms_page_revisions(page_id) WHERE status = 'draft';

CREATE UNIQUE INDEX cms_page_revisions_one_published
  ON cms_page_revisions(page_id) WHERE status = 'published';

CREATE INDEX idx_cms_page_revisions_page_status ON cms_page_revisions(page_id, status);

-- ── Sections (layout-driven blocks) ───────────────────────────────────────
CREATE TABLE cms_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES cms_page_revisions(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  subtitle text,
  layout text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (revision_id, slug)
);

CREATE INDEX idx_cms_sections_revision_order ON cms_sections(revision_id, sort_order);

-- ── Section items (collections, cities, interests, custom) ────────────────
CREATE TABLE cms_section_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES cms_sections(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('collection', 'city', 'interest', 'custom')),
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  label text,
  image_key text,
  href text,
  icon text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cms_section_items_section_order ON cms_section_items(section_id, sort_order);
CREATE INDEX idx_cms_section_items_collection ON cms_section_items(collection_id) WHERE collection_id IS NOT NULL;

-- ── Audit log ───────────────────────────────────────────────────────────────
CREATE TABLE cms_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES cms_pages(id) ON DELETE SET NULL,
  revision_id uuid REFERENCES cms_page_revisions(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cms_audit_logs_page ON cms_audit_logs(page_id, created_at DESC);

-- ── Studio access (role-based CMS authorization) ──────────────────────────
CREATE TABLE studio_members (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Bootstrap explore page shell ────────────────────────────────────────────
INSERT INTO cms_pages (slug, name) VALUES ('explore', 'Explore');
