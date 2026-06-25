import { Suspense } from "react";
import { HomePageSkeleton } from "@/components/home/home-page-skeleton";
import { SearchPageClient } from "@/components/search/search-page-client";

export default function SearchPage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <SearchPageClient />
    </Suspense>
  );
}
