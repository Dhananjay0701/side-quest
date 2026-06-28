import { getPublishedExplorePage } from "@/lib/cms/assemble";
import { ExplorePageClient } from "@/components/explore/explore-page-client";

/** CMS data needs the service-role key — only available at Worker runtime, not during `next build`. */
export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const initialData = await getPublishedExplorePage();
  return <ExplorePageClient initialData={initialData} />;
}
