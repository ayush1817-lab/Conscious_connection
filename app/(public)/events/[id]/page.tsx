import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/public/event-card";
import { EventPoster } from "@/components/public/event-poster";
import { ArrowLeftIcon, CalendarIcon, ClockIcon, ExternalIcon, PeopleIcon, PinIcon, RepeatIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";
import { RegisterForm } from "@/components/public/register-form";
import { ShareButton } from "@/components/public/share-button";
import { formatDate, formatShortDate, formatTimeRange } from "@/lib/format";
import { describeRecurrence, upcomingOccurrences } from "@/lib/events/recurrence";
import { FEW_PLACES, getEvent, getOccurrencePlacesLeft, getPlacesLeft, getSimilarEvents, placesBadge, seriesOf } from "@/lib/public/events";
import { publicImageUrl } from "@/lib/storage";
import { registerForEvent } from "./actions";

type Props = { params: Promise<{ id: string }> };

// How many upcoming dates of a recurring event people can register for.
const DATES_SHOWN = 8;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: "Event not running" };

  const when = describeRecurrence(seriesOf(event)) ?? `${formatShortDate(event.start_at)}, ${formatTimeRange(event.start_at, event.end_at)}`;
  const description = `${event.county} · ${when}. ${event.description}`.slice(0, 200);
  // Share previews (WhatsApp, Instagram, Facebook): the poster, or a generated card with the title, county and date.
  const image = event.poster_path ? publicImageUrl("posters", event.poster_path) : `/events/${event.id}/share-image`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.id}` },
    openGraph: { title: event.title, description, url: `/events/${event.id}`, images: [{ url: image, alt: `${event.title}, ${event.county}` }] },
    twitter: { title: event.title, description, images: [image] },
  };
}

// P3 Event detail.
export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  // A recurring event: people pick one of the next few dates; places are per date.
  const repeats = describeRecurrence(seriesOf(event), { withUntil: true });
  // Registration on another website: no RSVP form, dates or places here.
  const external = event.external_registration_url;
  const occurrences = repeats && !external ? upcomingOccurrences(seriesOf(event), DATES_SHOWN) : [];
  const [places, similar, datePlaces] = await Promise.all([
    getPlacesLeft([event.id]),
    getSimilarEvents(event),
    event.capacity && occurrences.length ? getOccurrencePlacesLeft(event.id, occurrences.map((o) => o.start)) : Promise.resolve(new Map<string, number>()),
  ]);
  const dates = occurrences.map((o) => {
    const left = datePlaces.get(o.start);
    return {
      value: o.start,
      label: `${formatDate(o.start)}${left === 0 ? " (full)" : left !== undefined && left < FEW_PLACES ? ` (${left === 1 ? "1 place" : `${left} places`} left)` : ""}`,
      full: left === 0,
    };
  });
  const placesLeft = places.get(event.id);
  // Full means every date offered is full (a one-off event: its only date).
  const full = repeats ? dates.length > 0 && dates.every((d) => d.full) : placesLeft === 0;
  const similarPlaces = await getPlacesLeft(similar.filter((e) => e.capacity).map((e) => e.id));
  const badge = repeats ? (full ? placesBadge(0) : undefined) : placesBadge(placesLeft);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/events" className="mb-4 inline-flex min-h-tap items-center gap-2 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeftIcon size={18} /> Back to events
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <EventPoster event={event} preload sizes="(min-width: 1024px) 720px, 100vw" className="rounded-card" />
          <h1 className="mt-6 font-heading text-3xl leading-tight font-semibold md:text-4xl">{event.title}</h1>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-lg">
            <li className="flex items-center gap-2">
              <PinIcon className="text-accent" /> {event.county}
            </li>
            {repeats ? (
              <li className="flex items-center gap-2 font-medium">
                <RepeatIcon className="text-accent" /> {repeats}
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <CalendarIcon className="text-accent" /> {repeats ? "Next: " : ""}
              {formatDate(event.start_at)}
            </li>
            <li className="flex items-center gap-2">
              <ClockIcon className="text-accent" /> {formatTimeRange(event.start_at, event.end_at)}
            </li>
          </ul>
          {badge ? (
            <p className={`mt-3 inline-block rounded-full px-3 py-1 font-semibold ${badge.full ? "bg-band text-text" : "bg-hero text-primary"}`}>
              {badge.label}
            </p>
          ) : null}

          {external ? (
            <ExternalRegisterLink href={external} className="mt-5 lg:hidden" />
          ) : (
            <a
              href="#register"
              className="mt-5 flex min-h-tap items-center justify-center rounded-control bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover lg:hidden"
            >
              {full ? "Event full" : "Register for this event"}
            </a>
          )}

          <section aria-labelledby="about-heading" className="mt-8">
            <h2 id="about-heading" className="font-heading text-2xl font-semibold">
              About this event
            </h2>
            <p className="mt-3 text-lg whitespace-pre-line">{event.description}</p>
          </section>

          <p className="mt-6 flex items-start gap-2 rounded-card bg-hero p-4">
            <PinIcon className="mt-0.5 shrink-0 text-primary" />
            {external
              ? "The exact location is shared when you register on the organiser's site."
              : "The exact location is shared by email when you register."}
          </p>

          <div className="mt-6">
            <ShareButton title={event.title} text={`${event.title} · ${event.county} · ${formatShortDate(event.start_at)}`} />
          </div>
        </div>

        <aside className="space-y-4">
          <section id="register" aria-labelledby="register-heading" className="scroll-mt-20 rounded-card border-2 border-primary bg-surface p-5">
            <h2 id="register-heading" className="font-heading text-xl font-semibold">
              Register
            </h2>
            {external ? (
              <>
                <p className="mt-2 mb-4">This event requires registration via an external site.</p>
                <ExternalRegisterLink href={external} />
              </>
            ) : full ? (
              <>
                <p className="mt-2">Sorry, this event is full{repeats ? " on the next few dates" : ""}.</p>
                <button
                  type="button"
                  disabled
                  className="mt-4 min-h-tap w-full cursor-not-allowed rounded-control border border-border bg-band px-5 font-medium text-muted"
                >
                  Event full
                </button>
                <Link href="/events" className="mt-3 inline-flex min-h-tap items-center font-medium text-primary underline underline-offset-4">
                  See other events
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 mb-4 text-muted">You&apos;ll get the exact address by email after registering.</p>
                <RegisterForm action={registerForEvent.bind(null, event.id)} dates={repeats ? dates : undefined} />
              </>
            )}
          </section>
          <section aria-labelledby="details-heading" className="rounded-card border border-border bg-surface p-5">
            <h2 id="details-heading" className="font-heading text-xl font-semibold">
              Event details
            </h2>
            <dl className="mt-4 space-y-4">
              {repeats ? (
                <Detail icon={<RepeatIcon className="text-accent" />} label="Repeats">
                  {repeats}
                </Detail>
              ) : null}
              <Detail icon={<CalendarIcon className="text-accent" />} label={repeats ? "Next date" : "Date"}>
                {formatDate(event.start_at)}
              </Detail>
              <Detail icon={<ClockIcon className="text-accent" />} label="Time">
                {formatTimeRange(event.start_at, event.end_at)}
              </Detail>
              <Detail icon={<PinIcon className="text-accent" />} label="Location">
                {event.county}
                <span className="block text-muted">Exact location shared after registration</span>
              </Detail>
              {!repeats && placesLeft !== undefined && placesLeft < FEW_PLACES ? (
                <Detail icon={<PeopleIcon className="text-accent" />} label="Places">
                  {placesLeft === 0 ? "Event full" : placesLeft === 1 ? "1 place left" : `${placesLeft} places left`}
                </Detail>
              ) : null}
            </dl>
          </section>
          <section aria-labelledby="host-heading" className="rounded-card border border-border bg-surface p-5">
            <h2 id="host-heading" className="font-heading text-xl font-semibold">
              Hosted by
            </h2>
            <p className="mt-2">A member of the Conscious Connections community.</p>
          </section>
        </aside>
      </div>

      {similar.length ? (
        <section aria-labelledby="similar-heading" className="mt-12">
          <SectionHeading id="similar-heading" title="More events" link={{ href: "/events", label: "View all events" }} />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((e) => {
              const b = placesBadge(similarPlaces.get(e.id));
              return (
                <li key={e.id}>
                  <EventCard event={e} badge={b?.label} full={b?.full} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

// Opens the organiser's own registration page in a new tab.
function ExternalRegisterLink({ href, className = "" }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex min-h-tap items-center justify-center gap-2 rounded-control bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover ${className}`}
    >
      Register here
      <ExternalIcon size={18} />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function Detail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-3 font-medium">
        {icon}
        {label}
      </dt>
      <dd className="pl-8">{children}</dd>
    </div>
  );
}
