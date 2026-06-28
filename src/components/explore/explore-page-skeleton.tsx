export function ExplorePageSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Mobile sticky bar */}
      <div className="border-b border-border/10 px-[18px] pb-3 pt-3 lg:hidden">
        <div className="h-11 rounded-[14px] bg-card/50" />
        <div className="mt-3 flex gap-1.5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-16 shrink-0 rounded-full bg-card/40" />
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="px-[18px] pb-6 pt-7 lg:grid lg:grid-cols-2 lg:gap-12 lg:px-12 lg:pb-4 lg:pt-12 xl:px-16 xl:pt-16">
        <div>
          <div className="h-3 w-24 rounded bg-card/30" />
          <div className="mt-3.5 h-8 w-56 rounded bg-card/50 lg:h-12 lg:w-80" />
          <div className="mt-2 hidden h-8 w-44 rounded bg-card/40 lg:block" />
          <div className="mt-3 h-4 w-64 rounded bg-card/30 lg:mt-5" />
          <div className="mt-6 border-t border-border/10 lg:hidden" />
        </div>
        <div className="mt-6 hidden aspect-[4/5] rounded-2xl bg-card/40 lg:block" />
      </section>

      {/* Desktop filters */}
      <div className="hidden px-12 pb-2 pt-6 lg:block xl:px-16">
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-card/35" />
          ))}
        </div>
      </div>

      {/* Featured */}
      <section className="px-[18px] pt-7 lg:px-12 lg:pt-14 xl:px-16 xl:pt-20">
        <div className="mb-4 h-3 w-20 rounded bg-card/30 lg:mb-8" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-5">
          <div className="col-span-2 aspect-[16/9] rounded-2xl bg-card/40 lg:col-span-1 lg:aspect-[3/4]" />
          <div className="aspect-[0.72] rounded-2xl bg-card/35 lg:aspect-[3/4]" />
          <div className="aspect-[0.72] rounded-2xl bg-card/35 lg:aspect-[3/4]" />
          <div className="col-span-2 aspect-[16/8] rounded-2xl bg-card/40 lg:col-span-1 lg:aspect-[3/4]" />
        </div>
      </section>

      {/* Trending */}
      <section className="pt-7 lg:px-12 lg:pt-14 xl:px-16 xl:pt-20">
        <div className="mb-4 px-[18px] lg:mb-8 lg:px-0">
          <div className="h-3 w-32 rounded bg-card/30" />
        </div>
        <div className="flex gap-2 overflow-hidden px-[18px] lg:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[178px] shrink-0 overflow-hidden rounded-[14px] bg-card/35">
              <div className="h-[138px] bg-card/50" />
              <div className="space-y-2 p-2.5">
                <div className="h-3.5 w-24 rounded bg-card/40" />
                <div className="h-3 w-full rounded bg-card/30" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden flex-col gap-6 lg:flex">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="grid h-56 grid-cols-2 rounded-2xl bg-card/30" />
          ))}
        </div>
      </section>

      {/* Official */}
      <section className="space-y-2 px-[18px] py-7 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0 lg:px-12 lg:py-14 xl:px-16 xl:py-20">
        <div className="mb-4 h-3 w-28 rounded bg-card/30 lg:col-span-3 lg:mb-8" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[158px] rounded-2xl bg-card/35 lg:aspect-[4/5] lg:h-auto" />
        ))}
      </section>

      {/* Cities */}
      <section className="pb-7 lg:px-12 lg:pb-14 xl:px-16">
        <div className="mb-4 px-[18px] lg:mb-8 lg:px-0">
          <div className="h-3 w-24 rounded bg-card/30" />
        </div>
        <div className="flex gap-4 overflow-hidden px-[18px] lg:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="h-16 w-16 rounded-full bg-card/40" />
              <div className="h-2.5 w-10 rounded bg-card/30" />
            </div>
          ))}
        </div>
        <div className="hidden gap-4 lg:grid lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-2xl bg-card/35" />
          ))}
        </div>
      </section>

      {/* Interests */}
      <section className="px-[18px] pb-7 lg:px-12 lg:pb-14 xl:px-16">
        <div className="mb-4 h-3 w-36 rounded bg-card/30 lg:mb-8" />
        <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-6 lg:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-[72px] rounded-xl bg-card/35 lg:h-28 lg:rounded-2xl" />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-[18px] pb-10 lg:px-12 lg:pb-16 xl:px-16">
        <div className="h-56 rounded-[20px] bg-card/30 lg:h-48 lg:rounded-2xl" />
      </section>
    </div>
  );
}
