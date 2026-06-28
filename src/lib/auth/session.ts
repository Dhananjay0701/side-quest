import { cache } from "react";
import { cookies, headers } from "next/headers";
import { unstable_cache } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileInitials } from "@/lib/auth/profile-utils";
import { profileAuth } from "@/lib/debug/profiler";
import type { Profile } from "@/lib/db/types";

export { getProfileInitials };

export class AuthError extends Error {
  constructor(
    message = "Unauthorized",
    public readonly status: 401 | 403 = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const AUTH_USER_ID_HEADER = "x-auth-user-id";
const AUTH_USER_ID_COOKIE = "rsq-auth-uid";

async function readValidatedAuthUserId(): Promise<string | null> {
  const headerStore = await headers();
  const fromHeader = headerStore.get(AUTH_USER_ID_HEADER);
  if (fromHeader) return fromHeader;

  const cookieStore = await cookies();
  return cookieStore.get(AUTH_USER_ID_COOKIE)?.value ?? null;
}

/**
 * Resolve the authenticated user for this request.
 *
 * Middleware validates the session once via `getUser()` and forwards the user id
 * via header + cookie. Server components read that locally (no Auth API call).
 */
export const getAuthUser = cache(async (): Promise<User | null> =>
  profileAuth("Auth User", async () => {
    const userId = await readValidatedAuthUserId();
    if (userId) return { id: userId } as User;

    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) return session.user;

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  })
);

async function fetchProfileByAuthUserId(authUserId: string): Promise<Profile | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, auth_user_id, username, display_name, email, avatar_url, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profile) return profile as Profile;

  return null;
}

function getCachedProfile(authUserId: string): Promise<Profile | null> {
  return unstable_cache(
    () => fetchProfileByAuthUserId(authUserId),
    [`auth-profile-${authUserId}`],
    { revalidate: 120, tags: [`profile-${authUserId}`] }
  )();
}

export const getAuthProfile = cache(async (): Promise<Profile | null> =>
  profileAuth("Auth Profile", async () => {
    const user = await getAuthUser();
    if (!user) return null;

    const cached = await getCachedProfile(user.id);
    if (cached) return cached;

    // Profile row missing — create (trigger may not have fired yet)
    const admin = createAdminClient();
    const displayName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Traveler";

    const { data: created, error } = await admin
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      })
      .select("id, auth_user_id, username, display_name, email, avatar_url, role")
      .single();

    if (error || !created) return null;
    return created as Profile;
  })
);

export async function requireAuthProfile(): Promise<Profile> {
  return profileAuth("Require Auth Profile", async () => {
    const profile = await getAuthProfile();
    if (!profile) throw new AuthError("Unauthorized", 401);
    return profile;
  });
}
