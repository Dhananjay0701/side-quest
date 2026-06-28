"use client";

import { ImageCacheProvider } from "@/components/providers/image-cache-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { SearchProvider } from "@/components/search/search-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ImageCacheProvider>
        <SearchProvider>{children}</SearchProvider>
      </ImageCacheProvider>
    </QueryProvider>
  );
}
