import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/components/public/event-form";
import { CheckCircleIcon } from "@/components/public/icons";
import { PageIntro } from "@/components/public/section-heading";
import { buttonClass } from "@/components/ui/button";
import { EMPTY_EVENT_FORM } from "@/lib/public/event-form";
import { submitEvent } from "./actions";
import { getPageIntro } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "Host an event",
  description: "Share a local walk, a book club or a cuppa with the Conscious Connections community.",
};

// H1 Submit an event. After sending, the form is replaced by the confirmation.
export default async function SubmitEventPage() {
  const intro = await getPageIntro("submit_event");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageIntro title={intro.heading} intro={intro.body}>
        <p>
          Please read our{" "}
          <Link href="/guidelines#events" className="font-medium text-primary underline underline-offset-4">
            guidelines for events
          </Link>{" "}
          before you submit.
        </p>
      </PageIntro>
      <EventForm
        action={submitEvent}
        initial={EMPTY_EVENT_FORM}
        submitLabel="Submit event for review"
        pendingLabel="Sending…"
        done={<Submitted />}
      />
    </div>
  );
}

function Submitted() {
  return (
    <>
      <CheckCircleIcon size={40} className="text-success" />
      <h2 className="mt-3 font-heading text-2xl font-semibold">Event submitted</h2>
      <p className="mt-2 text-lg">
        Thanks! Your event has been submitted and we&apos;ll review it shortly. We&apos;ll email you once it&apos;s approved.
      </p>
      <p className="mt-4 rounded-card bg-private p-4">
        Please check your spam folder if you don&apos;t see our emails. Keep the approval email safe, as it holds your link to edit
        or cancel your event.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className={buttonClass("primary")}>
          Back to home
        </Link>
        <a href="/submit-event" className={buttonClass("secondary")}>
          Submit another event
        </a>
      </div>
    </>
  );
}
