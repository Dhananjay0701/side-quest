import { createAdminClient } from "@/lib/supabase/admin";
import { getCmsPageBySlug } from "@/lib/cms/queries";
import { EXPLORE_PAGE_SLUG } from "@/lib/cms/types";

export class CmsGuardError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "CmsGuardError";
  }
}

/** Ensures the revision exists, belongs to the explore page, and is a draft. */
export async function assertExploreDraftRevision(revisionId: string): Promise<void> {
  const page = await getCmsPageBySlug(EXPLORE_PAGE_SLUG);
  if (!page) {
    throw new CmsGuardError("Explore page is not configured", "PAGE_NOT_FOUND");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cms_page_revisions")
    .select("id, page_id, status")
    .eq("id", revisionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new CmsGuardError("Revision not found", "REVISION_NOT_FOUND");
  }
  if (data.page_id !== page.id) {
    throw new CmsGuardError("Revision does not belong to this page", "REVISION_FORBIDDEN");
  }
  if (data.status !== "draft") {
    throw new CmsGuardError("Only draft revisions can be edited. Publish creates a new draft.", "DRAFT_REQUIRED");
  }
}
