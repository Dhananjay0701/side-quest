"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (query: string) => void;
  autoNavigate?: boolean;
}

export function SearchBar({
  placeholder = "Search collections, places, tags...",
  defaultValue = "",
  onSearch,
  autoNavigate = true,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  useEffect(() => setQuery(defaultValue), [defaultValue]);

  function submit(value: string) {
    const trimmed = value.trim();
    onSearch?.(trimmed);
    if (autoNavigate && trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        submit(query);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-2xl border-border/80 bg-card/40 pl-10"
      />
    </form>
  );
}
