import { Loading, Skeleton } from "@/components/ui/skeleton";

export default function AttentionLoading() {
  return (
    <Loading label="Loading…" className="space-y-6">
      <Skeleton className="h-6 w-36" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-20" />
    </Loading>
  );
}
