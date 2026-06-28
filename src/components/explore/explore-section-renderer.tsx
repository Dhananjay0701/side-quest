import type { ExploreSectionDTO } from "@/lib/cms/types";
import { CityGrid } from "@/components/explore/city-grid";
import { ExploreCTA } from "@/components/explore/explore-cta";
import { OfficialCollections } from "@/components/explore/official-collections";
import { TrendingCollections } from "@/components/explore/trending-collections";
import { InterestGrid } from "@/components/explore/interest-grid";
import { TrustSection } from "@/components/explore/trust-section";

interface ExploreSectionRendererProps {
  section: ExploreSectionDTO;
}

export function ExploreSectionRenderer({ section }: ExploreSectionRendererProps) {
  if (!section.visible) return null;

  switch (section.layout) {
    case "collection_scroll":
      return (
        <TrendingCollections
          headingId={`${section.id}-heading`}
          title={section.title}
          desktopTitle={section.metadata.desktopTitle}
          subtitle={section.subtitle}
          viewAllHref={section.metadata.viewAllHref}
          collections={section.collections ?? []}
          cardTextDesktop={section.cardTextDesktop}
          cardTextMobile={section.cardTextMobile}
        />
      );
    case "collection_grid":
      return (
        <OfficialCollections
          title={section.title}
          desktopTitle={section.metadata.desktopTitle}
          subtitle={section.subtitle}
          viewAllHref={section.metadata.viewAllHref}
          badgePrefix={section.metadata.badgePrefix}
          collections={section.collections ?? []}
          cardTextDesktop={section.cardTextDesktop}
          cardTextMobile={section.cardTextMobile}
        />
      );
    case "city_grid":
      return (
        <CityGrid
          title={section.title}
          desktopTitle={section.metadata.desktopTitle}
          subtitle={section.subtitle}
          viewAllHref={section.metadata.viewAllHref}
          cities={section.cities ?? []}
        />
      );
    case "interest_grid":
      return (
        <InterestGrid
          title={section.title}
          desktopTitle={section.metadata.desktopTitle}
          subtitle={section.subtitle}
          viewAllHref={section.metadata.viewAllHref}
          interests={section.interests ?? []}
        />
      );
    case "trust":
      return <TrustSection title={section.title} subtitle={section.subtitle} />;
    case "cta":
      return <ExploreCTA title={section.title} subtitle={section.subtitle} />;
    default:
      return null;
  }
}
