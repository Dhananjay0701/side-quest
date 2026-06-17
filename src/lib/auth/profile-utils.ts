import type { Profile } from "@/lib/db/types";

export function getProfileInitials(profile: Pick<Profile, "display_name" | "username">): string {
  const source = profile.display_name || profile.username || "RS";
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
