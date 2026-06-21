"use client";

import { LayoutGrid, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollectionViewMode } from "@/lib/map/types";

interface CollectionViewToggleProps {
  mode: CollectionViewMode;
  onChange: (mode: CollectionViewMode) => void;
  className?: string;
}

export function CollectionViewToggle({ mode, onChange, className }: CollectionViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-border/60 bg-card/60 p-0.5 backdrop-blur-sm",
        className
      )}
      role="tablist"
      aria-label="Collection view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "list"}
        onClick={() => onChange("list")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
          mode === "list"
            ? "bg-primary text-slate-900 shadow-sm"
            : "text-muted hover:text-foreground"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        List
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "map"}
        onClick={() => onChange("map")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
          mode === "map"
            ? "bg-primary text-slate-900 shadow-sm"
            : "text-muted hover:text-foreground"
        )}
      >
        <Map className="h-3.5 w-3.5" />
        Map
      </button>
    </div>
  );
}
