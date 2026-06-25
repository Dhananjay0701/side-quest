export default function CollectionLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="relative h-[38vh] min-h-[220px] bg-card/40 md:h-[42vh]" />
      <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-6 md:px-6">
        <div className="h-8 w-48 rounded-lg bg-card/60" />
        <div className="h-4 w-full max-w-xl rounded bg-card/40" />
        <div className="flex gap-2 pt-2">
          <div className="h-9 w-24 rounded-full bg-card/50" />
          <div className="h-9 w-24 rounded-full bg-card/50" />
        </div>
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-card/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
