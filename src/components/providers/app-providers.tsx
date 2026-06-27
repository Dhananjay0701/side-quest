"use client";

import { ImageCacheProvider } from "@/components/providers/image-cache-provider";
import { QueryProvider } from "@/components/providers/query-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ImageCacheProvider>{children}</ImageCacheProvider>
    </QueryProvider>
  );
}
