import { notFound } from "next/navigation";
import { CollectionDetailClient } from "@/components/collections/collection-detail-client";
import { getAuthProfile } from "@/lib/auth/session";
import { resolveAssetUrl } from "@/lib/images/assets";
import { getCollectionById, getCollectionFilters } from "@/lib/db/queries/collections";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getAuthProfile();

  try {
    const collection = await getCollectionById(id, profile?.id ?? null);
    const filters = await getCollectionFilters(id);
    const isOwner = profile?.id === collection.user_id;
    //console.log(collection.cover_image_url);
    return (
      <CollectionDetailClient
        collectionId={collection.id}
        name={collection.name}
        description={collection.description}
        placeCount={collection.place_count}
        coverImageUrl={resolveAssetUrl(collection.cover_image_url)}
        isPublic={collection.is_public}
        isOwner={isOwner}
        initialFilters={filters}
      />
    );
  } catch {
    notFound();
  }
}
