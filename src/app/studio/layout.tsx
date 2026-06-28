import { redirect } from "next/navigation";
import { getStudioAccessIfAny } from "@/lib/cms/auth";
import { StudioShell } from "@/components/studio/studio-shell";

/** Studio routes read Supabase with the service-role key at request time. */
export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { profile, canAccess } = await getStudioAccessIfAny();

  if (!profile) {
    redirect("/login?next=/studio");
  }

  if (!canAccess) {
    redirect("/");
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#070b14]">
      <StudioShell role={profile.role}>{children}</StudioShell>
    </div>
  );
}
