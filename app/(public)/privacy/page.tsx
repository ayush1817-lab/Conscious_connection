import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Conscious Connections uses and protects your details.",
};

// Placeholder wording (spec section 4). Karina must review it, ideally with GDPR advice.
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-6 rounded-card border border-warning bg-private p-4 font-medium">
        Draft: Karina to review. This wording is a placeholder and hasn&apos;t been checked for GDPR yet.
      </p>
      <h1 className="font-heading text-3xl font-semibold md:text-4xl">Privacy</h1>
      <div className="mt-6 space-y-6 text-lg">
        <section>
          <h2 className="font-heading text-xl font-semibold">The short version</h2>
          <p className="mt-2">
            You don&apos;t need an account to use this website. We only ask for the details we need, we never show
            them publicly, and we delete them soon after the event.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-xl font-semibold">When you register for an event</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>We ask for a name (a first name or nickname is fine) and your email.</li>
            <li>We use your email only to send you the event details, including the exact location.</li>
            <li>The host sees your name only, not your email.</li>
            <li>Your details are deleted 7 days after the event.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-heading text-xl font-semibold">When you host an event</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>The title, county, date, times, description and poster are shown publicly.</li>
            <li>The exact address, your contact details and your emergency contact are only seen by Karina.</li>
            <li>The exact address is emailed to people who register.</li>
            <li>Your private details are deleted 7 days after the event.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-heading text-xl font-semibold">Emails</h2>
          <p className="mt-2">
            We keep a copy of each email we send for 30 days, so we can check it arrived if there&apos;s a problem.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-xl font-semibold">Your rights</h2>
          <p className="mt-2">
            You can ask us what we hold about you, or ask us to delete it sooner, at any time.
          </p>
        </section>
      </div>
    </div>
  );
}
