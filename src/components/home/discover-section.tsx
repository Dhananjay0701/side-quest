"use client";

import {
  ChevronRight,
  CircleDot,
  Coffee,
  Compass,
  Hotel,
  Mountain,
  TreePine,
  Waves,
  Wine,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { slug: "all", label: "All", Icon: CircleDot },
  { slug: "restaurant", label: "Restaurants", Icon: Utensils },
  { slug: "cafe", label: "Cafes", Icon: Coffee },
  { slug: "bar", label: "Bars", Icon: Wine },
  { slug: "beach", label: "Beaches", Icon: Waves },
  { slug: "nature", label: "Nature", Icon: TreePine },
  { slug: "hotel", label: "Hotels", Icon: Hotel },
  { slug: "viewpoint", label: "Viewpoints", Icon: Mountain },
  { slug: "activity", label: "Activities", Icon: Compass },
] as const;

const SORT_OPTIONS = ["Most Viewed", "Newest", "A–Z"] as const;

interface DiscoverSectionProps {
  onCategoryChange?: (slug: string) => void;
  className?: string;
}

export function DiscoverSection({ onCategoryChange, className }: DiscoverSectionProps) {
  const [active, setActive] = useState<string>("all");
  const [sort, setSort] = useState<string>("Most Viewed");
  const [sortOpen, setSortOpen] = useState(false);

  function pick(slug: string) {
    setActive(slug);
    onCategoryChange?.(slug === "all" ? "" : slug);
  }

  return (
    <section className={cn("px-6 pb-5", className)}>
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary/10 text-secondary">
            <Compass className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-[15px] font-semibold">Discover</h2>
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/60 px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-border hover:text-foreground"
          >
            Sort by: <span className="font-medium text-foreground">{sort}</span>
            <ChevronRight
              className={cn("h-3 w-3 transition-transform", sortOpen && "rotate-90")}
            />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setSort(opt);
                    setSortOpen(false);
                  }}
                  className={cn(
                    "block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-border/30",
                    opt === sort ? "text-primary" : "text-muted"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-0.5">
        {CATEGORIES.map(({ slug, label, Icon }) => {
          const isActive = active === slug;
          return (
            <button
              key={slug}
              onClick={() => pick(slug)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-card/40 text-muted hover:border-border/80 hover:text-foreground"
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
