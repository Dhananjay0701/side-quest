import Link from "next/link";
import { Button } from "@/components/ui/button";
import { explorePageX } from "@/components/explore/explore-layout";
import { cn } from "@/lib/utils";

const BENEFITS = [
  "Save places",
  "Create collections",
  "Follow travellers",
  "AI recommendations",
] as const;

export function ExploreCTA({
  title = "Unlock 100+ curated collections",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section aria-labelledby="explore-cta-heading" className={cn(explorePageX, "pb-8 pt-5 lg:pb-12 lg:pt-8")}>
      {/* Mobile CTA */}
      <div className="relative overflow-hidden rounded-[20px] border border-border/20 bg-card p-7 lg:hidden">
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-60 w-60 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%)",
          }}
          aria-hidden
        />
        <p className="mb-3.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted/28">
          For members
        </p>
        <h2
          id="explore-cta-heading"
          className="text-[22px] font-medium leading-tight tracking-tight text-foreground"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-[270px] text-[13px] font-light leading-relaxed text-muted/40">
            {subtitle}
          </p>
        ) : (
          <p className="mt-2 max-w-[270px] text-[13px] font-light leading-relaxed text-muted/40">
            Save places, create collections, follow explorers and get recommendations built around
            how you travel.
          </p>
        )}
        <Button
          asChild
          className="mt-5 h-auto w-full rounded-xl py-3.5 text-sm font-semibold tracking-tight"
        >
          <Link href="/signup">Create a free account</Link>
        </Button>
        <p className="mt-3.5 text-center text-[11px] font-light tracking-wide text-muted/20">
          Sign in with Google or Apple — no password needed
        </p>
      </div>

      {/* Desktop CTA */}
      <div className="relative hidden overflow-hidden rounded-2xl border border-border/15 bg-card/50 px-12 py-14 lg:block xl:px-16 xl:py-16">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(20,184,166,0.06) 0%, transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative grid grid-cols-[1fr_auto] items-center gap-12">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted/30">
              For members
            </p>
            <h2
              id="explore-cta-heading-desktop"
              className="mt-3 text-3xl font-light leading-tight tracking-tight text-foreground xl:text-4xl"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-4 max-w-xl text-sm font-light leading-relaxed text-muted/55">
                {subtitle}
              </p>
            ) : null}
            <ul className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-2 text-sm font-light text-muted/55"
                >
                  <span className="text-primary/70" aria-hidden>
                    ✓
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex min-w-[260px] flex-col items-stretch gap-3">
            <Button
              asChild
              size="lg"
              className="h-auto rounded-xl py-3.5 text-sm font-semibold"
            >
              <Link href="/signup">Continue with Google</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-auto rounded-xl py-3.5 text-sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <p className="text-center text-[11px] font-light text-muted/25">
              No password needed
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
