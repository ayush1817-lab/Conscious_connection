import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PosterThumb } from "@/components/events/poster-thumb";
import { StatusBadge } from "@/components/events/status-badge";
import { requireAdmin } from "@/lib/auth/admin";
import { retentionCutoff } from "@/lib/events/status";
import { formatDate, formatDateTime, formatTimeRange, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Event · Conscious Connections" };

// Event detail. Milestone 3 shows the details and clears the "New" badge;
// milestone 4 adds the review actions (A3) and milestone 5 the live-event tools (A6).
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, event_private_details(*), registrations(name, created_at)")
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

      {event.status === "live" ? (
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
    </div>
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
