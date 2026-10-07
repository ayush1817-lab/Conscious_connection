import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveEventActions } from "@/components/events/live-event-actions";
import { PosterThumb } from "@/components/events/poster-thumb";
import { ReviewActions } from "@/components/events/review-actions";
import { StatusBadge } from "@/components/events/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/admin";
import { retentionCutoff } from "@/lib/events/status";
import { formatDate, formatDateTime, formatTimeRange, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { approveEvent, cancelEvent, regenerateLink, reviewWithReason, takeDownEvent } from "./actions";

export const metadata: Metadata = { title: "Event · Conscious Connections" };

const ATTENTION_HEADINGS = {
  host_edited: "Host edited event",
  host_cancelled: "Host cancelled event",
  contact_request: "Contact detail request",
} as const;

const ACTORS = { admin: "You", host: "Host", system: "Automatic" } as const;

// A3 (pending request with review actions) and A6 (every other status:
// read-only details, activity log, and for live events Take down, Cancel and
// Regenerate host link).
export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "*, event_private_details(*), registrations(name, created_at), event_activity(id, actor, action, note, created_at), attention_items(id, type, needs_decision, created_at, resolved_at)",
    )
    .eq("id", id)
    .gte("end_at", retentionCutoff())
    .maybeSingle();
  if (!event) notFound();

  // Opening a request clears its "New" badge on the overview.
  if (!event.opened_by_admin_at) {
    await supabase.from("events").update({ opened_by_admin_at: new Date().toISOString() }).eq("id", id);
  }

  const host = event.event_private_details;
  const registrants = [...event.registrations].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const activity = [...event.event_activity].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const openItems = event.attention_items.filter((i) => !i.resolved_at);
  const isPending = event.status === "pending";
  const isUpcomingLive = event.status === "live" && new Date(event.end_at).getTime() > Date.now();
  const showActivity = !isPending && tab === "activity";

  return (
    <div className="space-y-6">
      <Link href="/admin/events" className="inline-flex min-h-tap items-center text-primary underline-offset-4 hover:underline">
        ‹ Back to events
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{event.title}</h1>
        <StatusBadge status={event.status} endAt={event.end_at} />
        {event.status === "live" ? <span className="text-muted">{registrants.length} registered</span> : null}
      </div>

      {event.status_reason ? (
        <p className="rounded-card border border-border bg-surface px-4 py-3">
          <span className="font-medium">Reason given to the host:</span> {event.status_reason}
        </p>
      ) : null}

      {openItems.length ? (
        <section className="rounded-card border border-warning bg-private p-4">
          <h2 className="font-semibold">Needs your attention</h2>
          <ul className="mt-2 divide-y divide-border">
            {openItems.map((item) => (
              <li key={item.id}>
                <Link href={`/admin/attention/${item.id}`} className="group flex min-h-tap items-center gap-3 py-2">
                  <Badge tone={item.needs_decision ? "decision" : "neutral"}>
                    {item.needs_decision ? "Needs your decision" : "Update"}
                  </Badge>
                  <span className="flex-1 font-medium group-hover:underline">{ATTENTION_HEADINGS[item.type]}</span>
                  <span className="text-sm text-muted">{timeAgo(item.created_at)}</span>
                  <span aria-hidden className="text-xl text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isPending ? null : (
        <nav aria-label="Event sections" className="flex gap-1 border-b border-border">
          <Tab href={`/admin/events/${id}`} current={!showActivity}>
            Details
          </Tab>
          <Tab href={`/admin/events/${id}?tab=activity`} current={showActivity}>
            Activity log ({activity.length})
          </Tab>
        </nav>
      )}

      {showActivity ? (
        <section aria-label="Activity log" className="rounded-card border border-border bg-surface p-4">
          {activity.length ? (
            <ol className="space-y-4">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">
                      {a.action} <span className="font-normal text-muted">· {ACTORS[a.actor]}</span>
                    </p>
                    {a.note ? <p className="whitespace-pre-line">{a.note}</p> : null}
                    <p className="text-sm text-muted">{formatDateTime(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState>Nothing has happened to this event yet.</EmptyState>
          )}
        </section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-card border border-border bg-surface p-4">
              <h2 className="font-semibold">Public details</h2>
              <p className="text-sm text-muted">What will be shown on the website</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <PosterThumb path={event.poster_path} className="h-32 w-32" />
                <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <Detail label="Title">{event.title}</Detail>
                  <Detail label="County">{event.county}</Detail>
                  <Detail label="Date">{formatDate(event.start_at)}</Detail>
                  <Detail label="Time">{formatTimeRange(event.start_at, event.end_at)}</Detail>
                  <Detail label="Capacity">{event.capacity ? `${event.capacity} people` : "No limit"}</Detail>
                </dl>
              </div>
              <h3 className="mt-4 font-medium">Description</h3>
              <p className="mt-1 whitespace-pre-line">{event.description}</p>
            </section>

            <section className="rounded-card border border-border bg-private p-4">
              <h2 className="font-semibold">Private details</h2>
              <p className="text-sm text-muted">Only visible to you</p>
              {host ? (
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <Detail label="Host name">{host.host_name}</Detail>
                  <Detail label="Email">
                    <a href={`mailto:${host.host_email}`} className="text-primary underline underline-offset-4">
                      {host.host_email}
                    </a>
                  </Detail>
                  <Detail label="Phone">{host.host_phone}</Detail>
                  <Detail label="About the group">{host.about_group}</Detail>
                  <Detail label="Exact address">{host.exact_address}</Detail>
                  <Detail label="Emergency contact">
                    {host.emergency_contact_name}, {host.emergency_contact_phone}
                  </Detail>
                  <Detail label="Submitted">
                    {timeAgo(event.submitted_at)} ({formatDateTime(event.submitted_at)})
                  </Detail>
                </dl>
              ) : (
                <p className="mt-4 text-muted">The host&apos;s private details have been deleted.</p>
              )}
            </section>
          </div>

          {event.status === "live" || registrants.length ? (
            <section className="rounded-card border border-border bg-surface p-4">
              <h2 className="font-semibold">Registered ({registrants.length})</h2>
              {registrants.length ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {registrants.map((r, i) => (
                    <li key={i} className="rounded-full border border-border px-3 py-1">
                      {r.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted">Nobody has registered yet.</p>
              )}
            </section>
          ) : null}
        </>
      )}

      {isPending && host ? (
        <section aria-label="Review this request" className="rounded-card border border-border bg-surface p-4">
          <ReviewActions
            hostName={host.host_name}
            hostEmail={host.host_email}
            approve={approveEvent.bind(null, event.id)}
            requestChanges={reviewWithReason.bind(null, event.id, "needs_changes")}
            decline={reviewWithReason.bind(null, event.id, "declined")}
          />
        </section>
      ) : null}

      {isUpcomingLive ? (
        <section aria-label="Manage this event" className="rounded-card border border-border bg-surface p-4">
          <LiveEventActions
            hostName={host?.host_name ?? "the host"}
            hostEmail={host?.host_email ?? ""}
            registeredCount={registrants.length}
            takeDown={takeDownEvent.bind(null, event.id)}
            cancel={cancelEvent.bind(null, event.id)}
            regenerate={regenerateLink.bind(null, event.id)}
          />
        </section>
      ) : null}
    </div>
  );
}

function Tab({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`-mb-px inline-flex min-h-tap items-center border-b-2 px-4 font-medium ${
        current ? "border-primary text-text" : "border-transparent text-muted hover:text-text"
      }`}
    >
      {children}
    </Link>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
