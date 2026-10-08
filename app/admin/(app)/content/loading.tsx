import { Loading, Skeleton } from "@/components/ui/skeleton";

// Shown under the Website content heading and tabs while a tab loads.
export default function ContentLoading() {
  return (
    <Loading label="Loading…" className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-card border border-border bg-surface p-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </Loading>
  );
}
