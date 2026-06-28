import type { Profile } from "@/lib/db/types";
import { AuthError, getAuthProfile, requireAuthProfile } from "@/lib/auth/session";

export type { ProfileRole } from "@/lib/auth/roles-edge";
export {
  PROFILE_ROLES,
  canAccessStudio,
  fetchProfileRoleByAuthUserId,
  isAdminRole,
} from "@/lib/auth/roles-edge";

import type { ProfileRole } from "@/lib/auth/roles-edge";
import { isAdminRole } from "@/lib/auth/roles-edge";

export function isOwnerRole(role: ProfileRole): boolean {
  return role === "owner";
}

/** Any signed-in user. */
export async function requireUser(): Promise<Profile> {
  return requireAuthProfile();
}

/** Studio CMS + full admin (owner or admin). */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuthProfile();
  if (!isAdminRole(profile.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return profile;
}

/** Owner-only actions (billing, user management, etc.). */
export async function requireOwner(): Promise<Profile> {
  const profile = await requireAuthProfile();
  if (!isOwnerRole(profile.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return profile;
}

export async function getAuthProfileRole(): Promise<ProfileRole | null> {
  const profile = await getAuthProfile();
  return profile?.role ?? null;
}
