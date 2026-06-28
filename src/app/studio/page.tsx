import { getStudioAccessIfAny } from "@/lib/cms/auth";
import { StudioDashboard } from "@/components/studio/studio-dashboard";

export default async function StudioPage() {
  const { profile } = await getStudioAccessIfAny();
  return <StudioDashboard role={profile!.role} />;
}
