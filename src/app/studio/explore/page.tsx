import { getStudioAccessIfAny } from "@/lib/cms/auth";
import { ExploreEditor } from "@/components/studio/explore-editor";
import { redirect } from "next/navigation";

export default async function StudioExplorePage() {
  const { profile, canAccess } = await getStudioAccessIfAny();
  if (!profile || !canAccess) redirect("/");
  return <ExploreEditor role={profile.role} />;
}
