import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircleIcon } from "@/components/public/icons";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Event submitted", robots: { index: false, follow: false } };

// H2 Submitted confirmation. No accounts or dashboards: the private link comes by email.
export default function SubmittedPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <CheckCircleIcon size={48} className="text-success" />
      <h1 className="mt-4 font-heading text-3xl font-semibold md:text-4xl">Your event has been submitted</h1>
      <p className="mt-3 text-lg">Thank you for bringing people together. Here&apos;s what happens next.</p>

      <ol className="mt-6 space-y-4">
        {[
          ["Karina reviews it", "Usually within 24–48 hours."],
          ["If it's approved, it goes live", "It appears on the events page for everyone to see."],
          ["You get an email with a private link", "Use it to edit your event, see who has registered, or cancel it."],
        ].map(([title, text], i) => (
          <li key={title} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hero font-semibold text-primary">{i + 1}</span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 rounded-card bg-private p-4">
        Please check your spam folder if you don&apos;t see our emails. Keep the approval email safe, as it holds your link to
        edit or cancel your event.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonClass("primary")}>
          Back to home
        </Link>
        <Link href="/submit-event" className={buttonClass("secondary")}>
          Submit another event
        </Link>
      </div>
    </div>
  );
}
