import { ButtonLink } from "@/components/ui/button";

// Shown when a page calls notFound(), e.g. an event that was deleted or has been
// hidden by the 7-day retention rule.
export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h1 className="text-2xl font-semibold">We can&apos;t find that page</h1>
      <p className="mt-3 text-muted">
        It may have been deleted. Events disappear from the admin 7 days after they end.
      </p>
      <ButtonLink href="/admin" className="mt-6">
        Back to the admin home
      </ButtonLink>
    </div>
  );
}
