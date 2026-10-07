import type { Metadata } from "next";
import Link from "next/link";
import { PosterThumb } from "@/components/events/poster-thumb";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/admin";
import { getEventsOverview, type AttentionRow, type EventCard, type OtherStatus } from "@/lib/events/overview";
import { STATUS_LABELS } from "@/lib/events/status";
import { formatDate, formatShortDate, formatTimeRange, plural, timeAgo } from "@/lib/format";
import { markAttentionSeen } from "./actions";

export const metadata: Metadata = { title: "Events · Conscious Connections" };

const OTHER_ORDER: OtherStatus[] = ["needs_changes", "declined", "cancelled", "taken_down"];
const OTHER_NOTES: Record<OtherStatus, string> = {
  needs_changes: "Waiting on the host to make changes",
  declined: "Declined",
  cancelled: "Cancelled",
  taken_down: "Taken down",
};

// A2 – Events overview
export default async function EventsOverviewPage() {
  await requireAdmin();
  const overview = await getEventsOverview();
  const { counts } = overview;
  const otherTotal = OTHER_ORDER.reduce((n, s) => n + overview.other[s].length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold sm:text-3xl">Events overview</h1>
        <dl className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
          <CountTile value={counts.live} label="live events" />
          <CountTile value={counts.newRequests} label="new requests" />
          <CountTile value={counts.attention} label="attention items" />
        </dl>
      </div>

      <Section title={`Attention items (${counts.attention})`}>
        {overview.attention.length ? (
          <ul className="divide-y divide-border">
            {overview.attention.map((item) => (
              <AttentionItem key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <EmptyState>You&apos;re all caught up.</EmptyState>
        )}
      </Section>

      <Section title={`New requests (${counts.newRequests})`}>
        {overview.newRequests.length ? (
          <ul className="divide-y divide-border">
            {overview.newRequests.map((event) => (
              <NewRequest key={event.id} event={event} />
            ))}
          </ul>
        ) : (
          <EmptyState>No new requests right now.</EmptyState>
        )}
      </Section>

      <Section title={`Upcoming (${plural(counts.live, "live event")})`}>
        {overview.upcoming.length ? (
          <ul className="divide-y divide-border">
            {overview.upcoming.map((event) => (
              <EventLine key={event.id} event={event} />
            ))}
          </ul>
        ) : (
          <EmptyState>No live events coming up.</EmptyState>
        )}
      </Section>

      <Section title="Past (last 7 days)" note="Removed automatically after 7 days" muted>
        {overview.past.length ? (
          <ul className="divide-y divide-border">
            {overview.past.map((event) => (
              <EventLine key={event.id} event={event} muted />
            ))}
          </ul>
        ) : (
          <EmptyState>No events ended in the last 7 days.</EmptyState>
        )}
      </Section>

      <details className="group rounded-card border border-border bg-surface">
        <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold">
            Other events
            <span className="ml-2 font-normal text-muted">
              {OTHER_ORDER.map((s) => `${STATUS_LABELS[s]} (${overview.other[s].length})`).join(" · ")}
            </span>
          </span>
          <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="space-y-4 border-t border-border px-4 py-4">
          {otherTotal === 0 ? <EmptyState>Nothing here.</EmptyState> : null}
          {OTHER_ORDER.filter((s) => overview.other[s].length).map((status) => (
            <div key={status}>
              <h3 className="font-semibold">
                {STATUS_LABELS[status]} ({overview.other[status].length})
                <span className="ml-2 text-sm font-normal text-muted">{OTHER_NOTES[status]}</span>
              </h3>
              <ul className="mt-1 divide-y divide-border">
                {overview.other[status].map((event) => (
                  <EventLine key={event.id} event={event} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function CountTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col-reverse items-center rounded-card border border-border bg-surface px-4 py-2 text-center sm:min-w-28">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}

function Section({
  title,
  note,
  muted = false,
  children,
}: {
  title: string;
  note?: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-card border border-border p-4 ${muted ? "bg-background" : "bg-surface"}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {note ? <p className="text-sm text-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function AttentionItem({ item }: { item: AttentionRow }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <Link href={`/admin/attention/${item.id}`} className="group flex min-h-tap flex-1 flex-col justify-center gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={item.needsDecision ? "decision" : "neutral"}>{item.label}</Badge>
          <span className="font-medium group-hover:underline">{item.heading}</span>
        </span>
        <span>
          {item.eventTitle} <span className="text-muted">· {item.county}</span>
        </span>
        <span className="text-sm text-muted">{item.summary}</span>
      </Link>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="text-sm text-muted">{timeAgo(item.createdAt)}</span>
        {item.needsDecision ? (
          <Link
            href={`/admin/attention/${item.id}`}
            className="inline-flex min-h-tap items-center rounded-control border border-control-border px-4 font-medium hover:bg-background"
          >
            Review
          </Link>
        ) : (
          <form action={markAttentionSeen.bind(null, item.id, null)}>
            <button
              type="submit"
              className="min-h-tap rounded-control border border-control-border px-4 font-medium hover:bg-background"
              aria-label={`Mark as seen: ${item.heading}, ${item.eventTitle}`}
            >
              Mark as seen
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

function NewRequest({ event }: { event: EventCard }) {
  return (
    <li>
      <Link
        href={`/admin/events/${event.id}`}
        prefetch={false}
        className="group flex min-h-tap items-center gap-3 py-3 sm:gap-4"
      >
        <PosterThumb path={event.posterPath} className="h-14 w-14 sm:h-16 sm:w-16" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              {event.isNew ? <Badge tone="new">New</Badge> : null}
              <span className="font-medium group-hover:underline">{event.title}</span>
            </span>
            <span className="block text-muted">
              {event.county} · {formatDate(event.startAt)}
            </span>
          </span>
          <span className="text-sm text-muted sm:text-right sm:text-base">
            <span className="block text-text">{event.hostName ?? "Unknown host"}</span>
            Submitted {timeAgo(event.submittedAt)}
          </span>
        </span>
        <span aria-hidden className="text-xl text-muted">›</span>
      </Link>
    </li>
  );
}

function EventLine({ event, muted = false }: { event: EventCard; muted?: boolean }) {
  return (
    <li>
      <Link
        href={`/admin/events/${event.id}`}
        prefetch={false}
        className={`group flex min-h-tap items-center gap-3 py-3 ${muted ? "text-muted" : ""}`}
      >
        <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto]">
          <span className="font-medium group-hover:underline">{event.title}</span>
          <span className="text-right sm:order-last">{plural(event.registered, "registered", "registered")}</span>
          {/* Phone: one line "County · date"; desktop: separate columns. */}
          <span className={`col-span-2 sm:contents ${muted ? "" : "text-muted sm:text-text"}`}>
            <span>{event.county}</span>
            <span className="sm:hidden"> · </span>
            <span>
              {formatShortDate(event.startAt)}, {formatTimeRange(event.startAt, event.endAt)}
            </span>
          </span>
        </span>
        <span aria-hidden className="text-xl text-muted">›</span>
      </Link>
    </li>
  );
}
