"use client";

import { highlightMatch } from "@/lib/search/highlight";

interface SearchResultItemProps {
  title: string;
  subtitle?: string | null;
  query: string;
  badge?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export function SearchResultItem({
  title,
  subtitle,
  query,
  badge,
  icon,
  onSelect,
}: SearchResultItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-background/40 aria-selected:bg-background/50"
    >
      {icon ? <div className="shrink-0 text-muted/60">{icon}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{highlightMatch(title, query)}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted/55">{highlightMatch(subtitle, query)}</p>
        ) : null}
      </div>
      {badge ? (
        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
      <div className="h-8 w-8 animate-pulse rounded-lg bg-background/30" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 animate-pulse rounded bg-background/30" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-background/20" />
      </div>
    </div>
  );
}
