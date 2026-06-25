"use client";

import { notFound } from "next/navigation";
import { CollectionDetailClient } from "@/components/collections/collection-detail-client";
import { CollectionPageSkeleton } from "@/components/collections/collection-page-skeleton";
import { useCollectionDetailQuery } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";

export function CollectionPageClient({ collectionId }: { collectionId: string }) {
  const detailQuery = useCollectionDetailQuery(collectionId);

  const isFirstLoad = detailQuery.isPending && detailQuery.data === undefined;
  const isBackgroundRefresh = detailQuery.isFetching && detailQuery.data !== undefined;

  if (isFirstLoad) {
    return <CollectionPageSkeleton />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    notFound();
  }

  const { collection, filters, isOwner } = detailQuery.data;

  return (
    <div
      className={cn(
        "transition-opacity duration-300 ease-out",
        isBackgroundRefresh && "opacity-[0.98]"
      )}
    >
      <CollectionDetailClient
        collectionId={collection.id}
        name={collection.name}
        description={collection.description}
        placeCount={collection.placeCount}
        coverImageUrl={collection.coverImageUrl}
        isPublic={collection.isPublic}
        isOwner={isOwner}
        initialFilters={filters}
      />
    </div>
  );
}
