export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
}

export type ProfileRole = import("@/lib/auth/roles").ProfileRole;

export interface Profile {
  id: string;
  auth_user_id: string;
  username: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  role: ProfileRole;
}

/** @deprecated Use Profile — kept for migration compatibility */
export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  cover_source: string;
  place_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Place {
  id: string;
  user_id: string | null;
  google_place_id: string | null;
  google_maps_url: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  cover_image_url: string | null;
  category_id: string | null;
  likely_audience: string | null;
  likely_vibe: string | null;
  category_confidence: number | null;
  import_notes: string | null;
  search_enriched: boolean;
  enrichment_status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export interface PlaceDescription {
  short_text: string | null;
  long_text: string | null;
  interesting_facts?: string[];
}

export interface CollectionCard {
  id: string;
  name: string;
  description: string | null;
  placeCount: number;
  coverImageUrl: string | null;
  isPublic: boolean;
  topTags: string[];
  user: { displayName: string; avatarUrl: string | null; username?: string };
}

export interface PlaceCard {
  id: string;
  name: string;
  category: { slug: string; name: string } | null;
  tags: { slug: string; name: string }[];
  address: string | null;
  rating: number | null;
  coverImageUrl: string | null;
  shortDescription: string | null;
  googleMapsUrl: string;
  likelyAudience: string | null;
  likelyVibe: string | null;
  collectionName?: string;
  latitude?: number | null;
  longitude?: number | null;
  visitStatus?: "saved" | "visited";
}

export interface ImportJob {
  id: string;
  status: string;
  file_name: string | null;
  stats: Record<string, unknown>;
  error_message: string | null;
  collection_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface NormalizedPlace {
  name: string;
  googleMapsUrl: string;
  googlePlaceId: string | null;
  notes: string | null;
  importTags: string[];
  raw: Record<string, string>;
}

export interface NormalizedCollection {
  name: string;
  description: string | null;
  places: NormalizedPlace[];
}
