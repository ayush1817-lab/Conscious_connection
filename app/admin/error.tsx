"use client";

import { Button } from "@/components/ui/button";

// Friendly fallback for unexpected errors (e.g. the database can't be reached).
export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-muted">
        We couldn&apos;t load this page. Please try again. If it keeps happening, the site may have lost its connection to
        the database.
      </p>
      <Button className="mt-6" onClick={retry}>
        Try again
      </Button>
    </main>
  );
}
