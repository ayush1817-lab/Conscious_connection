import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircleIcon } from "@/components/public/icons";
import { buttonClass } from "@/components/ui/button";
import { getEvent } from "@/lib/public/events";

export const metadata: Metadata = { title: "You're registered", robots: { index: false, follow: false } };

// P5 Registration confirmed. Never shows the address: it's only in the email.
export default async function RegisteredPage({ params }: { params: Promise<{ id: string }> }) {
  const event = await getEvent((await params).id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <CheckCircleIcon size={48} className="text-success" />
      <h1 className="mt-4 font-heading text-3xl font-semibold md:text-4xl">Check your email</h1>
      <p className="mt-3 text-lg">
        We&apos;ve sent the address and details for {event ? <strong>{event.title}</strong> : "the event"} to your email.
      </p>
      <p className="mt-3 text-muted">
        If it isn&apos;t there in a few minutes, please check your spam or junk folder.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/events" className={buttonClass("primary")}>
          Find more events
        </Link>
        {event ? (
          <Link href={`/events/${event.id}`} className={buttonClass("secondary")}>
            Back to this event
          </Link>
        ) : null}
      </div>
    </div>
  );
}
