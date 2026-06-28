import { explorePageX, exploreSectionY } from "@/components/explore/explore-layout";
import { cn } from "@/lib/utils";

const TRUST_SOURCES = [
  "travel blogs",
  "local experts",
  "community collections",
] as const;

export function TrustSection({
  title = "How we curate",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section aria-labelledby="trust-heading" className={cn(explorePageX, exploreSectionY)}>
      <p
        id="trust-heading"
        className="text-xs font-light leading-relaxed tracking-wide text-muted/25 lg:hidden"
      >
        {subtitle ?? (
          <>
            Sourced from{" "}
            <span className="font-normal text-muted/55">travel guides, local experts,</span>
            <br />
            and <span className="font-normal text-muted/55">community picks.</span>
          </>
        )}
      </p>

      <div className="hidden max-w-2xl lg:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted/35">
          {title}
        </p>
        <p className="mt-4 text-lg font-light leading-relaxed tracking-tight text-muted/50">
          {subtitle ?? (
            <>
              Every collection is{" "}
              <span className="font-normal text-foreground/70">curated using</span> trusted
              sources.
            </>
          )}
        </p>
        <ul className="mt-6 space-y-3">
          {TRUST_SOURCES.map((source) => (
            <li
              key={source}
              className="flex items-center gap-3 text-sm font-light text-muted/45"
            >
              <span className="h-px w-6 bg-border/40" aria-hidden />
              {source}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
