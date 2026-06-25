export function PlacePageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-8 md:px-8">
      <div className="mb-4 h-4 w-32 rounded bg-card/50" />
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/30">
        <div className="flex flex-col sm:flex-row">
          <div className="h-44 w-full bg-card/40 sm:h-[11rem] sm:w-40 md:w-48" />
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div className="h-7 w-3/4 rounded bg-card/60" />
            <div className="h-4 w-24 rounded bg-card/40" />
            <div className="h-12 w-full rounded bg-card/30" />
          </div>
        </div>
      </div>
      <div className="mt-6 h-10 w-48 rounded-lg bg-card/50" />
    </div>
  );
}
