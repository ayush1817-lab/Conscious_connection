"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";

// Shown if something unexpected fails on a public page, instead of a blank screen.
export default function PublicError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-muted">
        Sorry, that didn&apos;t work. If you were sending a form, please check your email before trying again, in case it went
        through.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonClass("secondary")}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
