import { Loading, Skeleton } from "@/components/ui/skeleton";

export default function EventLoading() {
  return (
    <Loading label="Loading event…" className="space-y-6">
      <Skeleton className="h-6 w-36" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-56" />
      </div>
      <Skeleton className="h-14 w-full sm:w-96" />
    </Loading>
  );
}
