import { createAdminClient } from "@/lib/supabase/admin";
import { getSearchConfig } from "@/lib/search/config";

export async function checkSuggestRateLimit(rateKey: string): Promise<{ allowed: boolean }> {
  const { suggestRateLimitPerMin } = getSearchConfig();
  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60_000).toISOString();

  const { data: existing } = await supabase
    .from("search_rate_limits")
    .select("request_count, window_start")
    .eq("rate_key", rateKey)
    .maybeSingle();

  if (!existing || existing.window_start < windowStart) {
    await supabase.from("search_rate_limits").upsert(
      {
        rate_key: rateKey,
        request_count: 1,
        window_start: now.toISOString(),
      },
      { onConflict: "rate_key" }
    );
    return { allowed: true };
  }

  if (existing.request_count >= suggestRateLimitPerMin) {
    return { allowed: false };
  }

  await supabase
    .from("search_rate_limits")
    .update({ request_count: existing.request_count + 1 })
    .eq("rate_key", rateKey);

  return { allowed: true };
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
