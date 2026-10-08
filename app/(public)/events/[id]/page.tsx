import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/public/event-card";
import { EventPoster } from "@/components/public/event-poster";
import { ArrowLeftIcon, CalendarIcon, ClockIcon, PeopleIcon, PinIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";
import { ShareButton } from "@/components/public/share-button";
import { formatDate, formatShortDate, formatTimeRange } from "@/lib/format";
import { FEW_PLACES, getEvent, getPlacesLeft, getSimilarEvents, placesBadge } from "@/lib/public/events";
import { publicImageUrl } from "@/lib/storage";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: "Event not running" };

  const when = `${formatShortDate(event.start_at)}, ${formatTimeRange(event.start_at, event.end_at)}`;
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

  const [places, similar] = await Promise.all([getPlacesLeft([event.id]), getSimilarEvents(event)]);
  const placesLeft = places.get(event.id);
  const similarPlaces = await getPlacesLeft(similar.filter((e) => e.capacity).map((e) => e.id));
  const badge = placesBadge(placesLeft);

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
            <li className="flex items-center gap-2">
              <CalendarIcon className="text-accent" /> {formatDate(event.start_at)}
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

          <section aria-labelledby="about-heading" className="mt-8">
            <h2 id="about-heading" className="font-heading text-2xl font-semibold">
              About this event
            </h2>
            <p className="mt-3 text-lg whitespace-pre-line">{event.description}</p>
          </section>

          <p className="mt-6 flex items-start gap-2 rounded-card bg-hero p-4">
            <PinIcon className="mt-0.5 shrink-0 text-primary" />
            The exact location is shared by email when you register.
          </p>

          <div className="mt-6">
            <ShareButton title={event.title} text={`${event.title} · ${event.county} · ${formatShortDate(event.start_at)}`} />
          </div>
        </div>

        <aside className="space-y-4">
          <section aria-labelledby="details-heading" className="rounded-card border border-border bg-surface p-5">
            <h2 id="details-heading" className="font-heading text-xl font-semibold">
              Event details
            </h2>
            <dl className="mt-4 space-y-4">
              <Detail icon={<CalendarIcon className="text-accent" />} label="Date">
                {formatDate(event.start_at)}
              </Detail>
              <Detail icon={<ClockIcon className="text-accent" />} label="Time">
                {formatTimeRange(event.start_at, event.end_at)}
              </Detail>
              <Detail icon={<PinIcon className="text-accent" />} label="Location">
                {event.county}
                <span className="block text-muted">Exact location shared after registration</span>
              </Detail>
              {placesLeft !== undefined && placesLeft < FEW_PLACES ? (
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
