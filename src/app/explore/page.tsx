import { getPublishedExplorePage } from "@/lib/cms/assemble";
import { ExplorePageClient } from "@/components/explore/explore-page-client";

export default async function ExplorePage() {
  const initialData = await getPublishedExplorePage();
  return <ExplorePageClient initialData={initialData} />;
}
