import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Event cancelled", robots: { index: false, follow: false } };

// Shown once after a host cancels (H4). Kept off the private link's address.
export default async function HostCancelledPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const n = Math.max(0, Number((await searchParams).n) || 0);
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-heading text-3xl font-semibold md:text-4xl">Your event has been cancelled</h1>
      <p className="mt-3 text-lg">
        {n ? `We've emailed the ${plural(n, "person", "people")} who registered to let them know.` : "Nobody had registered, so no one needs to be told."}{" "}
        Karina has been told too.
      </p>
      <p className="mt-3 text-muted">Your private link no longer works. You&apos;re welcome to submit a new event any time.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/submit-event" className={buttonClass("primary")}>
          Submit a new event
        </Link>
        <Link href="/" className={buttonClass("secondary")}>
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}
