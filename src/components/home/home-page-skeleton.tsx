export function HomePageSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      <section className="px-4 pb-3 pt-4 md:px-6 md:pb-5 md:pt-7">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center">
          <div className="h-9 w-56 rounded-lg bg-card/60 md:h-11 md:w-72" />
          <div className="mt-3 h-5 w-40 rounded bg-card/40" />
          <div className="mt-4 h-12 w-full max-w-md rounded-xl bg-card/50" />
        </div>
      </section>

      <section className="px-[4vw] pb-[3vw]">
        <div className="mb-[2vw] flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-card/60" />
          <div className="h-5 w-36 rounded bg-card/50" />
        </div>
        <div className="flex gap-[2.5vw] overflow-hidden pl-[4vw]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] w-[65vw] shrink-0 rounded-2xl bg-card/40 md:w-[clamp(12rem,20vw,20rem)]"
            />
          ))}
        </div>
      </section>

      <section className="mt-6 hidden px-[4vw] md:block">
        <div className="h-5 w-32 rounded bg-card/50" />
        <div className="mt-4 h-24 rounded-2xl bg-card/30" />
      </section>
    </div>
  );
}
