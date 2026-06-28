import Link from "next/link";
import { cn } from "@/lib/utils";

interface ExploreSectionHeaderProps {
  title: string;
  desktopTitle?: string;
  subtitle?: string;
  href?: string;
  className?: string;
  id?: string;
}

export function ExploreSectionHeader({
  title,
  desktopTitle,
  subtitle,
  href,
  className,
  id,
}: ExploreSectionHeaderProps) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between lg:mb-4", className)}>
      <div>
        {subtitle && (
          <p className="mb-1 text-[10px] font-medium tracking-wide text-muted/30 lg:hidden">
            {subtitle}
          </p>
        )}
        <h2
          id={id}
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/35 lg:text-xs lg:tracking-[0.14em]"
        >
          <span className="lg:hidden">{title}</span>
          {desktopTitle ? (
            <span className="hidden lg:inline">{desktopTitle}</span>
          ) : (
            <span className="hidden lg:inline">{title}</span>
          )}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="text-xs font-medium tracking-tight text-muted/30 transition-colors hover:text-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
        >
          View all
        </Link>
      )}
    </div>
  );
}
