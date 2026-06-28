export async function runInBackground(fn: () => Promise<void>): Promise<void> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { ctx } = await getCloudflareContext();
    ctx.waitUntil(fn());
  } catch {
    // Local dev without Cloudflare context — fire and forget
    void fn().catch((err) => {
      console.error("Background task failed:", err);
    });
  }
}
