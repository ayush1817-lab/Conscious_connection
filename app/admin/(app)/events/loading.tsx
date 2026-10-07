import { Loading, Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <Loading label="Loading events…" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 sm:w-28" />
          ))}
        </div>
      </div>
      {[3, 2, 4].map((rows, i) => (
        <div key={i} className="space-y-3 rounded-card border border-border bg-surface p-4">
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: rows }, (_, j) => (
            <Skeleton key={j} className="h-12 w-full" />
          ))}
        </div>
      ))}
    </Loading>
  );
}
