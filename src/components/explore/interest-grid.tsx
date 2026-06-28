import Link from "next/link";
import { ExploreSectionHeader } from "@/components/explore/explore-section-header";
import {
  cardLift,
  explorePageX,
  exploreSectionY,
} from "@/components/explore/explore-layout";
import type { ExploreInterest } from "@/lib/explore/types";
import { cn } from "@/lib/utils";

const MOBILE_INTEREST_ROWS = 3;
const MOBILE_INTEREST_COLS = 3;

interface InterestGridProps {
  interests: ExploreInterest[];
  title: string;
  desktopTitle?: string;
  subtitle?: string;
  viewAllHref?: string;
  headingId?: string;
}

function MobileInterestCard({ interest }: { interest: ExploreInterest }) {
  return (
    <Link
      href={interest.href}
      className={cn(
        "flex flex-col items-center rounded-xl border border-border/10 bg-[#131a27] px-2.5 py-4 text-center",
        "transition-colors duration-200 hover:border-border/20 hover:bg-[#18212e]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      )}
    >
      <span className="mb-1.5 text-xl opacity-75" aria-hidden>
        {interest.icon}
      </span>
      <span className="text-[10.5px] font-medium leading-snug tracking-wide text-muted/45">
        {interest.label}
      </span>
    </Link>
  );
}

function DesktopInterestCard({ interest }: { interest: ExploreInterest }) {
  return (
    <Link
      href={interest.href}
      className={cn(
        "group flex flex-col items-start justify-between rounded-2xl border border-border/10 bg-card/40 p-6",
        "transition-colors duration-200 hover:border-border/25 hover:bg-card/60",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        cardLift
      )}
    >
      <span
        className="text-3xl opacity-80 transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-110"
        aria-hidden
      >
        {interest.icon}
      </span>
      <span className="mt-8 text-sm font-medium tracking-tight text-foreground/80">
        {interest.label}
      </span>
    </Link>
  );
}

export function InterestGrid({
  interests,
  title,
  desktopTitle,
  subtitle,
  viewAllHref,
  headingId = "interest-grid-heading",
}: InterestGridProps) {
  const mobileInterests = interests.slice(0, MOBILE_INTEREST_ROWS * MOBILE_INTEREST_COLS);

  return (
    <section aria-labelledby={headingId} className={cn(explorePageX, exploreSectionY)}>
      <ExploreSectionHeader
        id={headingId}
        title={title}
        desktopTitle={desktopTitle}
        subtitle={subtitle}
        href={viewAllHref}
      />

      <div className="grid grid-cols-3 gap-1.5 lg:hidden">
        {mobileInterests.map((interest) => (
          <MobileInterestCard key={interest.id} interest={interest} />
        ))}
      </div>

      <div className="hidden gap-4 sm:grid-cols-3 lg:grid lg:grid-cols-4 xl:grid-cols-6 xl:gap-5">
        {interests.map((interest) => (
          <DesktopInterestCard key={interest.id} interest={interest} />
        ))}
      </div>
    </section>
  );
}
