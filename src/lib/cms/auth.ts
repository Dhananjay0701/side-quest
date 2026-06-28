import { AuthError, getAuthProfile, requireAuthProfile } from "@/lib/auth/session";
import {
  canAccessStudio,
  requireAdmin,
  requireOwner,
  requireUser,
  type ProfileRole,
} from "@/lib/auth/roles";
import type { Profile } from "@/lib/db/types";

export { AuthError, requireAdmin, requireOwner, requireUser };
export type { ProfileRole };

/** @deprecated Use requireAdmin() */
export async function requireStudioAccess(): Promise<{ profile: Profile }> {
  const profile = await requireAdmin();
  return { profile };
}

export async function getStudioAccessIfAny(): Promise<{
  profile: Profile | null;
  canAccess: boolean;
}> {
  const profile = await getAuthProfile();
  if (!profile) return { profile: null, canAccess: false };
  return { profile, canAccess: canAccessStudio(profile.role) };
}
