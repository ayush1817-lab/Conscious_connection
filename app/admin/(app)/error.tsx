"use client";

import { Button } from "@/components/ui/button";

// Keeps the top bar when one admin page fails (the database can't be reached,
// a query errors). app/admin/error.tsx covers failures in the layout itself.
export default function AdminPageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md py-12 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-muted">
        This page couldn&apos;t be loaded. Please try again. If it keeps happening, the site may have lost its connection to
        the database.
      </p>
      {error.digest ? <p className="mt-2 text-sm text-muted">Error reference: {error.digest}</p> : null}
      <Button className="mt-6" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
