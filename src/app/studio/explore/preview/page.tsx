import { getDraftExplorePage } from "@/lib/cms/assemble";
import { ExplorePageClient } from "@/components/explore/explore-page-client";

export default async function StudioExplorePreviewPage() {
  const draft = await getDraftExplorePage();
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100/90">
        Draft preview — this is not the live Explore page.
      </div>
      <ExplorePageClient initialData={draft} previewMode />
    </div>
  );
}
