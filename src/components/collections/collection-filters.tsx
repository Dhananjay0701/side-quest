"use client";

import { ScopedSearch } from "@/components/layout/hero-search";
import { TagPill } from "@/components/places/tag-pill";

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
        <div className="mb-5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <TagPill
              key={tag.slug}
              label={tag.name}
              selected={selectedTags.includes(tag.slug)}
              onClick={() => onToggleTag(tag.slug)}
            />
          ))}
        </div>
      )}
    </>
  );
}
