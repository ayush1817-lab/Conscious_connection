import Link from "next/link";
import { formatShortDate, formatTimeRange } from "@/lib/format";
import type { PublicEvent } from "@/lib/public/events";
import { EventPoster } from "./event-poster";
import { CalendarIcon, PinIcon } from "./icons";

// Card for event lists: poster, title, county only, date and times (spec section 7).
// `badge` is "Few places left" / "Event full" when the list knows it.
// `level` is the heading level for the title: 3 under a section heading, 2 on a list page.
export function EventCard({
  event,
  badge,
  full = false,
  level = 3,
}: {
  event: PublicEvent;
  badge?: string;
  full?: boolean;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
      <EventPoster event={event} sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" />
      {badge ? (
        <span className="absolute top-3 right-3 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-primary shadow-sm">
          {badge}
        </span>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Heading className="font-heading text-lg leading-snug font-semibold">
          {/* The whole card is clickable through this link's ::after overlay. */}
          <Link href={`/events/${event.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {event.title}
          </Link>
        </Heading>
        <p className="flex items-center gap-2 text-muted">
          <PinIcon size={18} className="shrink-0 text-accent" />
          {event.county}
        </p>
        <p className="flex items-center gap-2 text-muted">
          <CalendarIcon size={18} className="shrink-0 text-accent" />
          {formatShortDate(event.start_at)} · {formatTimeRange(event.start_at, event.end_at)}
        </p>
        <span
          className={`mt-auto inline-flex min-h-tap items-center justify-center rounded-control border px-4 font-medium ${
            full ? "border-border text-muted" : "border-primary text-primary group-hover:bg-primary group-hover:text-on-primary"
          }`}
          aria-hidden
        >
          {full ? "Event full" : "View details"}
        </span>
      </div>
      {/* Keyboard focus ring for the whole card. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card group-has-[a:focus-visible]:outline-3 group-has-[a:focus-visible]:outline-primary" />
    </article>
  );
}
