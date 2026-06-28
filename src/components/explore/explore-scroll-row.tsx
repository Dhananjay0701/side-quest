import { cn } from "@/lib/utils";

interface ExploreScrollRowProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function ExploreScrollRow({
  children,
  className,
  ariaLabel,
}: ExploreScrollRowProps) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        className
      )}
    >
      {children}
    </div>
  );
}
