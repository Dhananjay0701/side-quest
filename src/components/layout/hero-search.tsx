"use client";

import { HeroSearchAutocomplete } from "@/components/search/hero-search-autocomplete";
import { cn } from "@/lib/utils";

interface HeroSearchProps {
  placeholder?: string;
  className?: string;
}

export function HeroSearch({ placeholder, className }: HeroSearchProps) {
  return (
    <HeroSearchAutocomplete
      placeholder={placeholder}
      className={className}
      variant="hero"
    />
  );
}

/* Compact scoped search for collection detail */
export { ScopedSearch } from "@/components/layout/hero-search-scoped";
