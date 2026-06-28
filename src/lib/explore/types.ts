export type FeaturedCardVariant = "hero" | "tall" | "wide";

export interface ExploreCollection {
  id: string;
  name: string;
  description: string;
  category: string;
  placeCount: number;
  imageUrl: string;
  href: string;
  duration?: string;
  /** Editorial tag shown in card metadata, e.g. "Weekend Escape" */
  tag?: string;
  /** Optional editorial cue, e.g. "Editor's Pick" */
  editorialCue?: string;
}

export interface FeaturedCollection extends ExploreCollection {
  variant: FeaturedCardVariant;
}

export interface ExploreCity {
  id: string;
  name: string;
  imageUrl: string;
  href: string;
}

export interface ExploreInterest {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export interface ExploreFilter {
  id: string;
  label: string;
}
