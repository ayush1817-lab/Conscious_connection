import type { Metadata } from "next";
import Link from "next/link";
import { EventRow, HostInviteCard } from "@/components/public/event-card";
import { EventFilters } from "@/components/public/event-filters";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/public/icons";
import { PageIntro } from "@/components/public/section-heading";
import { countyBySlug } from "@/lib/counties";
import { formatMonth } from "@/lib/format";
import { getPlacesLeft, listEvents, PAGE_SIZE, placesBadge, type PublicEvent, type When } from "@/lib/public/events";
import { getPageIntro } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "Events",
  description: "Discover local events for LGBTQ+ women and non-binary people across the island of Ireland.",
};

type Props = { searchParams: Promise<{ county?: string; when?: string; page?: string }> };

// Events in date order, grouped under a heading per month.
function byMonth(events: PublicEvent[]) {
  const groups: { month: string; events: PublicEvent[] }[] = [];
  for (const event of events) {
    const month = formatMonth(event.start_at);
    const last = groups.at(-1);
    if (last?.month === month) last.events.push(event);
    else groups.push({ month, events: [event] });
  }
  return groups;
}

// P2 Events listing: filters in a side panel, events as an agenda grouped by month.
export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const county = countyBySlug(params.county);
  const when: When = params.when === "week" || params.when === "month" ? params.when : "all";
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  const [{ events, total }, intro] = await Promise.all([listEvents({ county: county?.name ?? null, when, page }), getPageIntro("events")]);
  const places = await getPlacesLeft(events.filter((e) => e.capacity).map((e) => e.id));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    if (county) q.set("county", county.slug);
    if (when !== "all") q.set("when", when);
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return s ? `/events?${s}` : "/events";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageIntro title={intro.heading} intro={intro.body} eyebrow={intro.eyebrow} illustration="map" />

      <div className="events-layout">
        <aside className="events-aside" aria-label="Filter events">
          <EventFilters county={county?.slug ?? ""} when={when} />
          <div className="events-aside-card">
            <p className="font-heading text-lg font-semibold">Hosting or coming along?</p>
            <p className="mt-1 text-muted">
              Please read our{" "}
              <Link href="/guidelines#events" className="font-medium text-primary underline underline-offset-4">
                community guidelines for events
              </Link>
              .
            </p>
          </div>
        </aside>

        <div className="events-results min-w-0">
          <p className="events-count mb-2 font-medium" aria-live="polite">
            {total === 1 ? "1 event found" : `${total} events found`}
            {county ? <span className="text-muted"> in {county.name}</span> : null}
          </p>

          {events.length ? (
            byMonth(events).map((group) => (
              <section key={group.month} className="events-month">
                <h2 className="events-month-heading">{group.month}</h2>
                <ul className="flex flex-col gap-4">
                  {group.events.map((event) => {
                    const badge = placesBadge(places.get(event.id));
                    return (
                      <li key={event.id}>
                        <EventRow event={event} badge={badge?.label} full={badge?.full} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          ) : (
            <div className="events-empty rounded-card border border-border bg-surface p-6">
              <p className="text-lg">
                {county ? `No events in ${county.name} yet.` : when !== "all" ? "No events in that time yet." : "No events yet."}{" "}
                <Link href="/submit-event" className="font-medium text-primary underline underline-offset-4">
                  Want to host the first one?
                </Link>
              </p>
            </div>
          )}

          {events.length && events.length < 3 && page === pages ? (
            <div className="mt-6">
              <HostInviteCard level={2} />
            </div>
          ) : null}

          {pages > 1 ? (
            <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-control border border-border bg-surface">
                  <ArrowLeftIcon size={18} />
                  <span className="sr-only">Previous page</span>
                </Link>
              ) : null}
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={pageHref(n)}
                  aria-current={n === page ? "page" : undefined}
                  className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-control border border-border bg-surface font-medium aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-on-primary"
                >
                  <span className="sr-only">Page </span>
                  {n}
                </Link>
              ))}
              {page < pages ? (
                <Link href={pageHref(page + 1)} className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-control border border-border bg-surface">
                  <ArrowRightIcon size={18} />
                  <span className="sr-only">Next page</span>
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
