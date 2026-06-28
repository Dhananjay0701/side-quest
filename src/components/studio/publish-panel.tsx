"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { parseApiJson } from "@/lib/api/response";
import { useQueryInvalidation } from "@/lib/query/hooks";

interface PublishPanelProps {
  onPublished: () => void;
}

export function PublishPanel({ onPublished }: PublishPanelProps) {
  const { afterPublishExplore } = useQueryInvalidation();
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function publish() {
    if (!confirm("Publish draft to the live Explore page?")) return;
    setPublishing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/studio/explore/publish", {
        method: "POST",
        credentials: "same-origin",
      });
      const json = await parseApiJson<{ versionNumber: number }>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Publish failed");
      setMessage(`Published v${json.data?.versionNumber ?? ""}`);
      afterPublishExplore();
      onPublished();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => void publish()} disabled={publishing}>
        {publishing ? "Publishing…" : "Publish"}
      </Button>
      {message ? <span className="text-xs text-muted/50">{message}</span> : null}
    </div>
  );
}
