import Link from "next/link";
import { describeRecurrence } from "@/lib/events/recurrence";
import { dateParts, formatShortDate, formatTimeRange } from "@/lib/format";
import { seriesOf, type PublicEvent } from "@/lib/public/events";
import { Doodle } from "./doodles";
import { EventPoster } from "./event-poster";
import { ArrowRightIcon, CalendarIcon, ClockIcon, PinIcon, RepeatIcon } from "./icons";
import { Illustration } from "./illustrations";

// A calendar-style date tile: "SUN / 1 / NOV".
export function DateTile({ iso, className = "" }: { iso: string; className?: string }) {
  const d = dateParts(iso);
  return (
    <span aria-hidden className={`date-tile ${className}`}>
      <span className="date-tile-weekday">{d.weekday}</span>
      <span className="date-tile-day">{d.day}</span>
      <span className="date-tile-month">{d.month}</span>
    </span>
  );
}

function Badge({ label, full }: { label: string; full: boolean }) {
  return <span className={`event-badge ${full ? "event-badge-full" : ""}`}>{label}</span>;
}

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
  const repeats = describeRecurrence(seriesOf(event));
  return (
    <article className="event-card group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface">
      <div className="relative">
        <EventPoster event={event} sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw" />
        <DateTile iso={event.start_at} className="event-card-date" />
        {badge ? <Badge label={badge} full={full} /> : null}
      </div>
      <div className="event-card-body flex flex-1 flex-col gap-2 p-4">
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
          {repeats ? "Next: " : ""}
          {formatShortDate(event.start_at)} · {formatTimeRange(event.start_at, event.end_at)}
        </p>
        {repeats ? (
          <p className="flex items-center gap-2 font-medium text-primary">
            <RepeatIcon size={18} className="shrink-0 text-accent" />
            {repeats}
          </p>
        ) : null}
        <span aria-hidden className={`event-card-cta mt-auto inline-flex items-center gap-1 pt-2 font-medium ${full ? "text-muted" : "text-primary"}`}>
          {full ? "Event full" : "View details"} {full ? null : <ArrowRightIcon size={18} className="transition-transform group-hover:translate-x-1" />}
        </span>
      </div>
      {/* Keyboard focus ring for the whole card. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card group-has-[a:focus-visible]:outline-3 group-has-[a:focus-visible]:outline-primary" />
    </article>
  );
}

// One line of the Events page agenda: date tile, details, poster thumbnail.
export function EventRow({ event, badge, full = false }: { event: PublicEvent; badge?: string; full?: boolean }) {
  const repeats = describeRecurrence(seriesOf(event));
  return (
    <article className="event-row group relative grid items-center rounded-card border border-border bg-surface">
      <DateTile iso={event.start_at} className="event-row-date" />
      <div className="event-row-body min-w-0">
        <h3 className="font-heading text-lg leading-snug font-semibold md:text-xl">
          <Link href={`/events/${event.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {event.title}
          </Link>
        </h3>
        <p className="event-row-meta mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted">
          <span className="inline-flex items-center gap-1.5">
            <PinIcon size={17} className="shrink-0 text-accent" />
            {event.county}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon size={17} className="shrink-0 text-accent" />
            {repeats ? "Next: " : ""}
            {formatShortDate(event.start_at)} · {formatTimeRange(event.start_at, event.end_at)}
          </span>
          {repeats ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-primary">
              <RepeatIcon size={17} className="shrink-0 text-accent" />
              {repeats}
            </span>
          ) : null}
        </p>
        <span aria-hidden className={`mt-2 inline-flex items-center gap-1 font-medium ${full ? "text-muted" : "text-primary"}`}>
          {full ? "Event full" : "View details"} {full ? null : <ArrowRightIcon size={18} className="transition-transform group-hover:translate-x-1" />}
        </span>
      </div>
      <div className="event-row-poster relative">
        <EventPoster event={event} sizes="(min-width: 768px) 240px, 100vw" />
        {badge ? <Badge label={badge} full={full} /> : null}
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card group-has-[a:focus-visible]:outline-3 group-has-[a:focus-visible]:outline-primary" />
    </article>
  );
}

// Fills the empty places in a short event list, so one event never stretches across the page.
export function HostInviteCard({ level = 3 }: { level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <article className="host-invite-card group relative flex h-full flex-col items-start justify-center gap-2 rounded-card p-6">
      <Doodle name="sparkle" tone="primary" className="host-invite-spark" />
      <Illustration name="host" className="host-invite-art" />
      <Heading className="font-heading text-lg font-semibold">
        <Link href="/submit-event" className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
          Your event could be here
        </Link>
      </Heading>
      <p className="text-muted">A coffee, a walk or a book swap. Small gatherings are perfect.</p>
      <span aria-hidden className="mt-1 inline-flex items-center gap-1 font-medium text-primary">
        Host an event <ArrowRightIcon size={18} className="transition-transform group-hover:translate-x-1" />
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card group-has-[a:focus-visible]:outline-3 group-has-[a:focus-visible]:outline-primary" />
    </article>
  );
}
