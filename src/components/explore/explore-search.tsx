"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ExploreSearchProps {
  className?: string;
}

export function ExploreSearch({ className }: ExploreSearchProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function submit(value: string) {
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form
      className={cn("relative w-full", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit(query);
      }}
      role="search"
    >
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/35"
        aria-hidden
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cities, places or experiences…"
        aria-label="Search cities, places or experiences"
        className="h-11 w-full rounded-[14px] border border-border/30 bg-card/80 px-10 text-sm tracking-tight text-foreground placeholder:font-light placeholder:text-muted/30 transition-colors focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/20"
      />
      <button
        type="button"
        aria-label="Filter search"
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted/30 transition-colors hover:text-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </form>
  );
}
