import type { Metadata } from "next";
import { EventForm } from "@/components/public/event-form";
import { PageIntro } from "@/components/public/section-heading";
import { EMPTY_EVENT_FORM } from "@/lib/public/event-form";
import { submitEvent } from "./actions";

export const metadata: Metadata = {
  title: "Host an event",
  description: "Share a local walk, a book club or a cuppa with the Conscious Connections community.",
};

// H1 Submit an event.
export default function SubmitEventPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageIntro title="Host an event">
        Create a local event and bring people together. It&apos;s quick and easy, and it helps build our community. Karina
        reviews every event before it goes live.
      </PageIntro>
      <EventForm action={submitEvent} initial={EMPTY_EVENT_FORM} submitLabel="Submit event for review" pendingLabel="Sending…" />
    </div>
  );
}
