import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileInitials } from "@/lib/auth/profile-utils";
import type { Profile } from "@/lib/db/types";

export { getProfileInitials };

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export const getAuthUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getAuthProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, auth_user_id, username, display_name, email, avatar_url")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile) return profile as Profile;

  // Fallback: profile trigger may not have fired yet — create via admin
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
    .select("id, auth_user_id, username, display_name, email, avatar_url")
    .single();

  if (error || !created) return null;
  return created as Profile;
});

export async function requireAuthProfile(): Promise<Profile> {
  const profile = await getAuthProfile();
  if (!profile) throw new AuthError();
  return profile;
}

