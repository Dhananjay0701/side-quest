/**
 * Edge-runtime-safe role helpers (middleware).
 * Must not import session.ts or any Node-only modules.
 */

export const PROFILE_ROLES = ["owner", "admin", "editor", "user"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export function isAdminRole(role: ProfileRole): boolean {
  return role === "owner" || role === "admin";
}

export function canAccessStudio(role: ProfileRole): boolean {
  return isAdminRole(role);
}

/** Edge-safe role lookup for middleware (service role REST). */
export async function fetchProfileRoleByAuthUserId(
  authUserId: string
): Promise<ProfileRole | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const endpoint = new URL(`${url}/rest/v1/profiles`);
  endpoint.searchParams.set("auth_user_id", `eq.${authUserId}`);
  endpoint.searchParams.set("select", "role");
  endpoint.searchParams.set("limit", "1");

  const res = await fetch(endpoint.toString(), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const rows = (await res.json()) as Array<{ role: ProfileRole }>;
  return rows[0]?.role ?? null;
}
