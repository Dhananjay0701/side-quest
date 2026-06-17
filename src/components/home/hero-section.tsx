import { HeroSearch } from "@/components/layout/hero-search";

interface HeroSectionProps {
  showOnboarding?: boolean;
  onboardingSlot?: React.ReactNode;
}

export function HeroSection({ showOnboarding, onboardingSlot }: HeroSectionProps) {
  return (
    <section className="relative px-4 pb-3 pt-4 md:px-6 md:pb-5 md:pt-7 lg:pb-7 lg:pt-9">
      {/* Subtle teal glow — desktop/tablet only */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 hidden h-[260px] w-[500px] -translate-x-1/2 opacity-25 blur-3xl md:block"
        style={{ background: "radial-gradient(ellipse, rgba(20,184,166,0.15) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto flex max-w-[1400px] flex-col items-center text-center">
        {/* Mobile: 36px headline · Desktop: 38px */}
        <h1 className="text-[32px] font-bold leading-none tracking-tight lg:text-[44px]">
          Where to{" "}
          <span className="text-primary">next</span>
          ?
        </h1>

        {/* Mobile: 16px subtitle */}
        <p className="mt-1.5 text-base text-muted/80 md:mt-2 md:text-[18px]">
          Take the road not taken.
        </p>

        {/* Mobile: full width 48px · Desktop: max 480px */}
        <div className="mt-3 w-full md:mt-5 lg:max-w-[580px]">
          <HeroSearch />
        </div>

        {showOnboarding && onboardingSlot && (
          <div className="mt-6 w-full md:mt-8">{onboardingSlot}</div>
        )}
      </div>
    </section>
  );
}
