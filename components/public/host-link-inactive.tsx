import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

// H5: shown for every host link that doesn't work, whatever the reason, so the
// page never reveals whether a link ever existed.
export function HostLinkInactive() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-heading text-3xl font-semibold md:text-4xl">This link is no longer active</h1>
      <p className="mt-3 text-lg">This usually means one of these things:</p>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-lg">
        <li>the event has ended,</li>
        <li>the event was cancelled or removed, or</li>
        <li>a newer link was sent to you, which replaces this one.</li>
      </ul>
      <p className="mt-4 text-muted">If your event is still running, we can email you a fresh link.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/host/resend" className={buttonClass("primary")}>
          Send me a new link
        </Link>
        <Link href="/" className={buttonClass("secondary")}>
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}
