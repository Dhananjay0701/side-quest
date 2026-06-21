"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ScopedSearch } from "@/components/layout/hero-search";
import { TagPill } from "@/components/places/tag-pill";
import { cn } from "@/lib/utils";

interface CollectionFiltersProps {
  query: string;
  onQueryChange: (q: string) => void;
  category: string | null;
  onCategoryChange: (slug: string | null) => void;
  selectedTags: string[];
  onToggleTag: (slug: string) => void;
  categories: { slug: string; name: string; count: number }[];
  tags: { slug: string; name: string; count: number }[];
}

export function CollectionFilters({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  selectedTags,
  onToggleTag,
  categories,
  tags,
}: CollectionFiltersProps) {
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const hasManyTags = tags.length > 4;

  return (
    <>
      <div className="mb-[3vw] w-full md:mb-4">
        <ScopedSearch
          placeholder="Search places in this collection..."
          onSearch={onQueryChange}
        />
      </div>

      {categories.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <TagPill label="All" selected={!category} onClick={() => onCategoryChange(null)} />
          {categories.map((cat) => (
            <TagPill
              key={cat.slug}
              label={`${cat.name} (${cat.count})`}
              selected={category === cat.slug}
              onClick={() => onCategoryChange(category === cat.slug ? null : cat.slug)}
            />
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="mb-5">
          <div className="relative">
            <div
              className={cn(
                "flex flex-wrap gap-1.5 transition-[max-height] duration-200",
                !tagsExpanded && hasManyTags && "max-h-8 overflow-hidden"
              )}
            >
              {tags.map((tag) => (
                <TagPill
                  key={tag.slug}
                  label={tag.name}
                  selected={selectedTags.includes(tag.slug)}
                  onClick={() => onToggleTag(tag.slug)}
                />
              ))}
            </div>
            {!tagsExpanded && hasManyTags && (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background via-background/80 to-transparent"
                aria-hidden
              />
            )}
          </div>
          {hasManyTags && (
            <button
              type="button"
              onClick={() => setTagsExpanded((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              {tagsExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show all {tags.length} tags
                </>
              )}
            </button>
          )}
        </div>
      )}
    </>
  );
}
