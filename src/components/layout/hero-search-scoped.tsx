"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
