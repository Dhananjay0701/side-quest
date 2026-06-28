import type { ExplorePageDTO } from "@/lib/cms/types";

/** Client-safe: derive hero/section image URLs for prefetch from an assembled DTO. */
export function getExplorePreloadUrlsFromDto(dto: ExplorePageDTO): string[] {
  const urls = new Set<string>();

  if (dto.hero.imageUrl) urls.add(dto.hero.imageUrl);
  if (dto.hero.desktop.cinematic.imageUrl) urls.add(dto.hero.desktop.cinematic.imageUrl);
  if (dto.hero.desktop.featured.main.imageUrl) urls.add(dto.hero.desktop.featured.main.imageUrl);
  for (const pick of dto.hero.picks) {
    if (pick.imageUrl) urls.add(pick.imageUrl);
  }
  for (const stacked of dto.hero.desktop.featured.stack) {
    if (stacked.imageUrl) urls.add(stacked.imageUrl);
  }

  for (const section of dto.sections) {
    for (const collection of section.collections?.slice(0, 2) ?? []) {
      if (collection.imageUrl) urls.add(collection.imageUrl);
    }
  }

  return [...urls].filter(Boolean);
}

/** City circle images — load after above-the-fold content. */
export function getExploreIdlePreloadUrlsFromDto(dto: ExplorePageDTO): string[] {
  const urls = new Set<string>();

  for (const section of dto.sections) {
    if (section.layout !== "city_grid") continue;
    for (const city of section.cities ?? []) {
      if (city.imageUrl) urls.add(city.imageUrl);
    }
  }

  return [...urls].filter(Boolean);
}
