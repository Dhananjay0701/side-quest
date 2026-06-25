/** Row returned by get_collections_top_tags RPC */
export interface RpcTopTagRow {
  collection_id: string;
  tag_name: string;
}

/** Place payload from get_recent_places_for_user RPC */
export interface RpcRecentPlaceRow {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  cover_image_url: string | null;
  google_maps_url: string;
  likely_audience: string | null;
  likely_vibe: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, unknown> | null;
  category_slug: string | null;
  category_name: string | null;
  short_text: string | null;
  collection_name: string | null;
  tags: { slug: string; name: string }[];
}

export interface RpcFilterFacet {
  slug: string;
  name: string;
  count: number;
}

export interface RpcCollectionFilterCounts {
  categories: RpcFilterFacet[];
  tags: RpcFilterFacet[];
}
