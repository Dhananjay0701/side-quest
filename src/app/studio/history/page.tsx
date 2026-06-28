import { getCmsAuditLogs, getCmsPageBySlug } from "@/lib/cms/queries";

export default async function StudioHistoryPage() {
  const page = await getCmsPageBySlug("explore");
  const history = page ? await getCmsAuditLogs(page.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">History</h2>
        <p className="mt-1 text-sm text-muted/55">Audit trail for Explore editorial changes</p>
      </div>

      {!page ? (
        <p className="text-sm text-muted/50">Explore page is not configured.</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted/50">No audit events yet.</p>
      ) : (
        <ul className="space-y-3">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-border/15 bg-card/30 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{entry.action}</span>
                <time className="text-xs text-muted/40">
                  {new Date(entry.created_at).toLocaleString()}
                </time>
              </div>
              {entry.actor_id ? (
                <p className="mt-1 text-xs text-muted/40">Actor: {entry.actor_id}</p>
              ) : null}
              {Object.keys(entry.payload).length > 0 ? (
                <pre className="mt-2 overflow-x-auto rounded bg-background/30 p-2 text-[11px] text-muted/50">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
