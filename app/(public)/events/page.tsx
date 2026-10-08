import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/public/event-card";
import { EventFilters } from "@/components/public/event-filters";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/public/icons";
import { PageIntro } from "@/components/public/section-heading";
import { countyBySlug } from "@/lib/counties";
import { getPlacesLeft, listEvents, PAGE_SIZE, placesBadge, type When } from "@/lib/public/events";

export const metadata: Metadata = {
  title: "Events",
  description: "Discover local events for LGBTQ+ women and non-binary people across rural Ireland.",
};

type Props = { searchParams: Promise<{ county?: string; when?: string; page?: string }> };

// P2 Events listing.
export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const county = countyBySlug(params.county);
  const when: When = params.when === "week" || params.when === "month" ? params.when : "all";
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  const { events, total } = await listEvents({ county: county?.name ?? null, when, page });
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
      <PageIntro title="Events">Discover local events for LGBTQ+ women and non-binary people across rural Ireland.</PageIntro>

      <EventFilters county={county?.slug ?? ""} when={when} />

      <p className="mt-6 mb-4 font-medium" aria-live="polite">
        {total === 1 ? "1 event found" : `${total} events found`}
      </p>

      {events.length ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const badge = placesBadge(places.get(event.id));
            return (
              <li key={event.id}>
                <EventCard event={event} level={2} badge={badge?.label} full={badge?.full} />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-card border border-border bg-surface p-6">
          <p className="text-lg">
            {county ? `No events in ${county.name} yet.` : when !== "all" ? "No events in that time yet." : "No events yet."}{" "}
            <Link href="/submit-event" className="font-medium text-primary underline underline-offset-4">
              Want to host the first one?
            </Link>
          </p>
        </div>
      )}

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
  );
}
