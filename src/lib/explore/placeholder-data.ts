import type {
  ExploreCity,
  ExploreCollection,
  ExploreFilter,
  ExploreInterest,
  FeaturedCollection,
} from "@/lib/explore/types";

export const EXPLORE_FILTERS: ExploreFilter[] = [
  { id: "all", label: "All" },
  { id: "trending", label: "Trending" },
  { id: "hidden-gems", label: "Hidden Gems" },
  { id: "food", label: "Food" },
  { id: "coffee", label: "Coffee" },
  { id: "nature", label: "Nature" },
  { id: "architecture", label: "Architecture" },
  { id: "photography", label: "Photography" },
  { id: "date-ideas", label: "Date Ideas" },
  { id: "nightlife", label: "Nightlife" },
  { id: "road-trips", label: "Road Trips" },
  { id: "solo-travel", label: "Solo Travel" },
];

export const FEATURED_COLLECTIONS: FeaturedCollection[] = [
  {
    id: "slow-goa",
    variant: "hero",
    name: "The Slow Goa",
    description: "Hidden beaches, cozy cafés and laid-back vibes",
    category: "Goa · Beach",
    placeCount: 12,
    tag: "Weekend Escape",
    editorialCue: "Editor's Pick",
    imageUrl:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&q=85",
    href: "#",
  },
  {
    id: "tokyo-after-dark",
    variant: "tall",
    name: "Tokyo After Dark",
    description: "Neon lights and tiny bars",
    category: "Tokyo · Night",
    placeCount: 16,
    tag: "Night Route",
    imageUrl:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=85",
    href: "#",
  },
  {
    id: "london-secret-cafes",
    variant: "tall",
    name: "London's Secret Cafés",
    description: "Spots the locals love",
    category: "London · Coffee",
    placeCount: 9,
    tag: "Local Favourite",
    imageUrl:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=85",
    href: "#",
  },
  {
    id: "budapest-hidden-gems",
    variant: "wide",
    name: "Budapest Hidden Gems",
    description: "Ruins, baths and secret rooftop views",
    category: "Budapest · Architecture",
    placeCount: 13,
    tag: "Hidden Gems",
    imageUrl:
      "https://images.unsplash.com/photo-1520342868574-5fa3804e551c?w=1200&q=85",
    href: "#",
  },
  {
    id: "amalfi-coast",
    variant: "tall",
    name: "Amalfi by Sea",
    description: "Cliffside villages and lemon groves",
    category: "Italy · Coast",
    placeCount: 11,
    tag: "Coastal Slow",
    imageUrl:
      "https://images.unsplash.com/photo-1534113414506-26e4ed12a2b4?w=800&q=85",
    href: "#",
  },
];

export const TRENDING_COLLECTIONS: ExploreCollection[] = [
  {
    id: "santorini-sunrise",
    name: "Santorini Sunrise",
    description: "Best spots to watch dawn break over the caldera",
    category: "Santorini",
    placeCount: 8,
    duration: "Half day",
    tag: "Sunset Route",
    imageUrl:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=900&q=80",
    href: "#",
  },
  {
    id: "bali-slow-life",
    name: "Bali Slow Life",
    description: "Temples, rice fields and honest warungs",
    category: "Bali",
    placeCount: 14,
    duration: "Full day",
    tag: "Slow Travel",
    imageUrl:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=80",
    href: "#",
  },
  {
    id: "istanbul-bazaars",
    name: "Istanbul Bazaars",
    description: "Spice routes, hidden teahouses and the sound of prayer",
    category: "Istanbul",
    placeCount: 11,
    duration: "Half day",
    tag: "Local Favourite",
    imageUrl:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=900&q=80",
    href: "#",
  },
  {
    id: "marrakech-medina",
    name: "Marrakech Medina",
    description: "Colors, souks and the quiet of a riad courtyard",
    category: "Marrakech",
    placeCount: 10,
    duration: "Full day",
    tag: "Weekend Escape",
    imageUrl:
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=900&q=80",
    href: "#",
  },
];

export const OFFICIAL_COLLECTIONS: ExploreCollection[] = [
  {
    id: "paris-beyond",
    name: "Paris Beyond the Postcards",
    description: "Secret spots only locals talk about",
    category: "Paris",
    placeCount: 15,
    duration: "Half day",
    tag: "Local Favourite",
    imageUrl:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80",
    href: "#",
  },
  {
    id: "kyoto-temple-walk",
    name: "Kyoto Temple Walk",
    description: "Ancient paths, bamboo groves and the weight of silence",
    category: "Kyoto",
    placeCount: 11,
    duration: "Full day",
    tag: "Temple Walk",
    imageUrl:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=80",
    href: "#",
  },
  {
    id: "lisbon-hidden-hills",
    name: "Lisbon's Hidden Hills",
    description: "Miradouros, tascas and fado drifting from a window",
    category: "Lisbon",
    placeCount: 9,
    duration: "Full day",
    tag: "Hidden Hills",
    imageUrl:
      "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=900&q=80",
    href: "#",
  },
];

export const EXPLORE_CITIES: ExploreCity[] = [
  {
    id: "goa",
    name: "Goa",
    imageUrl:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&q=80",
    href: "#",
  },
  {
    id: "london",
    name: "London",
    imageUrl:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80",
    href: "#",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    imageUrl:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
    href: "#",
  },
  {
    id: "paris",
    name: "Paris",
    imageUrl:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
    href: "#",
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    imageUrl:
      "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&q=80",
    href: "#",
  },
  {
    id: "bangkok",
    name: "Bangkok",
    imageUrl:
      "https://images.unsplash.com/photo-1563492065-9a78e4e4b4f2?w=600&q=80",
    href: "#",
  },
  {
    id: "budapest",
    name: "Budapest",
    imageUrl:
      "https://images.unsplash.com/photo-1520342868574-5fa3804e551c?w=600&q=80",
    href: "#",
  },
  {
    id: "delhi",
    name: "Delhi",
    imageUrl:
      "https://images.unsplash.com/photo-1587474260587-136574528ed5?w=600&q=80",
    href: "#",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    imageUrl:
      "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&q=80",
    href: "#",
  },
  {
    id: "bir",
    name: "Bir",
    imageUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    href: "#",
  },
];

export const EXPLORE_INTERESTS: ExploreInterest[] = [
  { id: "coffee", label: "Coffee", icon: "☕", href: "#" },
  { id: "food", label: "Food", icon: "🍜", href: "#" },
  { id: "nature", label: "Nature", icon: "🌿", href: "#" },
  { id: "photography", label: "Photography", icon: "📷", href: "#" },
  { id: "architecture", label: "Architecture", icon: "📐", href: "#" },
  { id: "nomads", label: "Digital Nomads", icon: "💻", href: "#" },
  { id: "date-ideas", label: "Date Ideas", icon: "💑", href: "#" },
  { id: "nightlife", label: "Nightlife", icon: "🌙", href: "#" },
  { id: "walking", label: "Walking", icon: "🚶", href: "#" },
  { id: "mountains", label: "Mountains", icon: "⛰", href: "#" },
  { id: "history", label: "History", icon: "🏛", href: "#" },
  { id: "hidden-gems", label: "Hidden Gems", icon: "💎", href: "#" },
];

export function getHeroPickCollections(): FeaturedCollection[] {
  return FEATURED_COLLECTIONS.slice(0, 3);
}

export function getHeroDesktopLayout() {
  return {
    main: FEATURED_COLLECTIONS[0]!,
    stack: [FEATURED_COLLECTIONS[1]!, FEATURED_COLLECTIONS[2]!] as const,
    strip: FEATURED_COLLECTIONS[3]!,
  };
}

export function getHeroFeaturedCollection(): FeaturedCollection {
  return FEATURED_COLLECTIONS[0]!;
}

/** @deprecated Hero picks are shown in ExploreHero; grid section removed */
export function getGridFeaturedCollections(): FeaturedCollection[] {
  return FEATURED_COLLECTIONS.slice(3);
}

/** @deprecated Secondary cards are part of hero picks layout */
export function getHeroSecondaryCollections(): FeaturedCollection[] {
  return FEATURED_COLLECTIONS.slice(1, 3);
}

export function getExplorePreloadUrls(): string[] {
  const hero = getHeroFeaturedCollection().imageUrl;
  const trending = TRENDING_COLLECTIONS.slice(0, 2).map((c) => c.imageUrl);
  return [hero, ...trending];
}
