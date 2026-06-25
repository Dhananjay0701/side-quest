import { getAuthProfile } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/api/response";
import { profileApiRoute } from "@/lib/debug/profiler";

export const GET = profileApiRoute("GET", "/api/me", async () => {
  try {
    const profile = await getAuthProfile();
    if (!profile) {
      return apiSuccess(null);
    }

    return apiSuccess({
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      email: profile.email,
      avatarUrl: profile.avatar_url,
    });
  } catch (err) {
    return apiError("USER_ERROR", err instanceof Error ? err.message : "Failed to get user", 500);
  }
});
