"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HeroSearchProps {
  placeholder?: string;
  className?: string;
}

export function HeroSearch({
  placeholder = "Search places, tags, or collections...",
  className,
}: HeroSearchProps) {
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
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted/60" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-full border border-border/60 bg-[#1a2540]/80 pl-10 pr-12 text-[15px] text-foreground shadow-md placeholder:text-muted/50 transition-all focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 md:h-11 md:text-[13px]"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted/60 hover:text-muted"
      >
        <SlidersHorizontal className="h-[14px] w-[14px]" />
      </button>
    </form>
  );
}

/* Compact scoped search for collection detail */
export function ScopedSearch({
  placeholder = "Search places...",
  onSearch,
  className,
}: {
  placeholder?: string;
  onSearch: (q: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  function submit(value: string) {
    onSearch(value.trim());
  }

  return (
    <form
      className={cn("relative w-full", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit(query);
      }}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-muted/50" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value.trim()) onSearch("");
        }}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border/50 bg-card/60 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/15"
      />
    </form>
  );
}
