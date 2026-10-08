import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

// Shown for any event that isn't visible: cancelled, taken down, ended, still
// being reviewed, or never existed. The page returns HTTP 404.
export default function EventNotRunning() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-heading text-3xl font-semibold md:text-4xl">This event is no longer running</h1>
      <p className="mt-3 text-lg text-muted">It may have finished, or the host may have cancelled it. There are plenty of others to choose from.</p>
      <Link href="/events" className={buttonClass("primary", "mt-6")}>
        See upcoming events
      </Link>
    </div>
  );
}
