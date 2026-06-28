-- Deny direct client access to CMS tables (service role bypasses RLS)

ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_page_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_section_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_audit_logs ENABLE ROW LEVEL SECURITY;
