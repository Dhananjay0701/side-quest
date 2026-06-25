import { PlacePageClient } from "@/components/places/place-page-client";

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlacePageClient placeId={id} />;
}
