"use client";

import type { ExploreFilter } from "@/lib/explore/types";
import { cn } from "@/lib/utils";

interface ExploreFiltersProps {
  filters: ExploreFilter[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function ExploreFilters({ filters, activeId, onChange, className }: ExploreFiltersProps) {
  return (
    <nav
      aria-label="Explore filters"
      className={cn(
        "scrollbar-hide flex gap-1.5 overflow-x-auto pb-2.5 lg:gap-2 lg:pb-3",
        className
      )}
    >
      <div role="tablist" className="flex gap-1.5">
        {filters.map((filter) => {
          const isActive = activeId === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(filter.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium tracking-wide transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
                isActive
                  ? "border-primary bg-primary font-semibold text-background"
                  : "border-border/30 bg-transparent text-muted/45 hover:border-border/50 hover:text-muted/70"
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
