export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Question skeleton */}
      <div className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
        <div className="skeleton h-6 w-6 shrink-0 rounded" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
      </div>

      {/* Answer skeleton */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
        <div className="mb-4 flex items-center justify-between border-b border-outline-variant/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-5 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
          <div className="skeleton h-5 w-32 rounded" />
        </div>
        <div className="space-y-3">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>
      </div>

      {/* Sources skeleton */}
      <div className="space-y-3">
        <div className="skeleton h-5 w-32 rounded" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <div className="skeleton h-4 w-48 rounded" />
              <div className="skeleton h-5 w-20 rounded" />
            </div>
            <div className="rounded-r-lg border-y border-r border-l-2 border-outline-variant/60 border-l-surface-container-high bg-canvas p-3">
              <div className="space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
