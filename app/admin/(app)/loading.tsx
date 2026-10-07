import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6 py-4 sm:py-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="mx-auto h-9 w-64" />
      <Skeleton className="mx-auto h-5 w-48" />
      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
