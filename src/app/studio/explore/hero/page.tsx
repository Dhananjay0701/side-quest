import { getStudioAccessIfAny } from "@/lib/cms/auth";
import { HeroEditor } from "@/components/studio/hero-editor";
import { redirect } from "next/navigation";

export default async function StudioHeroPage() {
  const { profile, canAccess } = await getStudioAccessIfAny();
  if (!profile || !canAccess) redirect("/");
  return <HeroEditor role={profile.role} />;
}
