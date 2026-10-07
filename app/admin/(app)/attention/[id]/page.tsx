import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReasonDialog } from "@/components/events/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { requireAdmin } from "@/lib/auth/admin";
import { FIELD_LABELS, retentionCutoff } from "@/lib/events/status";
import { formatDate, formatDateTime, formatTimeRange, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { markAttentionSeen } from "../../events/actions";
import { takeDownEvent } from "../../events/[id]/actions";
import { declineContactRequest, shareContactDetails } from "./actions";

export const metadata: Metadata = { title: "Attention item · Conscious Connections" };

const HEADINGS = {
  host_edited: "Host edited event",
  host_cancelled: "Host cancelled event",
  contact_request: "Contact detail request",
} as const;

// A7 – Attention item detail.
export default async function AttentionItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("attention_items")
    .select(
      "id, type, ref_id, needs_decision, created_at, resolved_at, events!inner(id, title, county, start_at, end_at, status, event_private_details(host_name, host_email), registrations(count))",
    )
    .eq("id", id)
    .gte("events.end_at", retentionCutoff())
    .maybeSingle();
  if (!item) notFound();

  const event = item.events;
  const host = event.event_private_details;
  const registered = event.registrations[0]?.count ?? 0;
  const open = !item.resolved_at;
  const isUpcomingLive = event.status === "live" && new Date(event.end_at).getTime() > Date.now();

  const [edit, request] = await Promise.all([
    item.type === "host_edited" && item.ref_id
      ? supabase.from("event_edits").select("changes").eq("id", item.ref_id).maybeSingle()
      : null,
    item.type === "contact_request" && item.ref_id
      ? supabase.from("contact_requests").select("host_reason, status, admin_reason").eq("id", item.ref_id).maybeSingle()
      : null,
  ]);
  const changes = sortedChanges(edit?.data?.changes);

  return (
    <div className="space-y-6">
      <Link href="/admin/events" className="inline-flex min-h-tap items-center text-primary underline-offset-4 hover:underline">
        ‹ Back to events
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold sm:text-3xl">{HEADINGS[item.type]}</h1>
          <Badge tone={item.needs_decision ? "decision" : "neutral"}>
            {item.needs_decision ? "Needs your decision" : "Update"}
          </Badge>
        </div>
        <p>
          <Link href={`/admin/events/${event.id}`} className="font-medium text-primary underline underline-offset-4">
            {event.title}
          </Link>{" "}
          <span className="text-muted">
            · {event.county} · {formatDate(event.start_at)}, {formatTimeRange(event.start_at, event.end_at)}
          </span>
        </p>
        <p className="text-sm text-muted">
          {timeAgo(item.created_at)} ({formatDateTime(item.created_at)})
        </p>
      </div>

      {!open ? (
        <p role="status" className="rounded-card border border-border bg-surface px-4 py-3">
          This has already been dealt with{item.resolved_at ? ` (${timeAgo(item.resolved_at)})` : ""}.
        </p>
      ) : null}

      {item.type === "host_edited" ? (
        <section className="rounded-card border border-border bg-surface p-4">
          <h2 className="font-semibold">What the host changed</h2>
          <p className="text-sm text-muted">These changes are already live on the website.</p>
          {changes.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left">
                <thead>
                  <tr className="border-b border-border text-sm text-muted">
                    <th scope="col" className="py-2 pr-4 font-medium">Field</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Before</th>
                    <th scope="col" className="py-2 font-medium">After</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map(([field, change]) => (
                    <tr key={field} className="border-b border-border align-top last:border-0">
                      <th scope="row" className="py-2 pr-4 font-medium">{FIELD_LABELS[field] ?? field}</th>
                      <td className="py-2 pr-4 text-muted line-through decoration-muted/60">{show(field, change.before)}</td>
                      <td className="py-2">{show(field, change.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-muted">The details of this change are no longer available.</p>
          )}
        </section>
      ) : null}

      {item.type === "host_cancelled" ? (
        <section className="rounded-card border border-border bg-surface p-4">
          <h2 className="font-semibold">The host cancelled this event</h2>
          <p className="mt-1">
            {registered === 0
              ? "Nobody had registered."
              : `The ${registered === 1 ? "1 registered person has" : `${registered} registered people have`} been emailed.`}{" "}
            Nothing else needs doing.
          </p>
        </section>
      ) : null}

      {item.type === "contact_request" ? (
        <section className="rounded-card border border-border bg-surface p-4">
          <h2 className="font-semibold">
            {host?.host_name ?? "The host"} would like registrants&apos; contact details
          </h2>
          {request?.data ? (
            <blockquote className="mt-2 border-l-4 border-border pl-3">“{request.data.host_reason}”</blockquote>
          ) : null}
          <p className="mt-3">
            {registered === 0
              ? "Nobody has registered yet."
              : `${registered} ${registered === 1 ? "person has" : "people have"} registered. Sharing sends ${host?.host_name ?? "the host"} each person's name and email address.`}
          </p>
          {request?.data && request.data.status !== "requested" ? (
            <p className="mt-2 text-muted">
              {request.data.status === "shared" ? "You shared the contact details." : `You declined: ${request.data.admin_reason}`}
            </p>
          ) : null}
        </section>
      ) : null}

      {open ? (
        <section aria-label="Actions" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:flex-wrap">
          {item.type === "contact_request" && host ? (
            <>
              <ConfirmDialog
                trigger="Share contact details"
                title="Share contact details?"
                confirmLabel="Yes, share them"
                action={shareContactDetails.bind(null, item.id)}
                variant="primary"
              >
                <p>
                  The names and email addresses of the {registered === 1 ? "1 registered person" : `${registered} registered people`}{" "}
                  will be emailed to {host.host_name} ({host.host_email}). This can&apos;t be undone.
                </p>
              </ConfirmDialog>
              <ReasonDialog
                trigger="Decline"
                title="Decline this request"
                submitLabel="Send and decline"
                hostName={host.host_name}
                hostEmail={host.host_email}
                action={declineContactRequest.bind(null, item.id)}
                variant="danger"
              />
            </>
          ) : null}
          {item.type !== "contact_request" ? (
            <form action={markAttentionSeen.bind(null, item.id, "/admin/events")}>
              <button
                type="submit"
                className="inline-flex min-h-tap w-full items-center justify-center rounded-control bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover sm:w-auto"
              >
                Mark as seen
              </button>
            </form>
          ) : null}
          {item.type === "host_edited" && isUpcomingLive && host ? (
            <ReasonDialog
              trigger="Take down"
              title="Take down this event"
              submitLabel="Send and take down"
              hostName={host.host_name}
              hostEmail={host.host_email}
              action={takeDownEvent.bind(null, event.id)}
              variant="danger"
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

type Change = { before: unknown; after: unknown };

// jsonb doesn't keep key order, so list fields in form order.
function sortedChanges(raw: unknown): [string, Change][] {
  if (!raw || typeof raw !== "object") return [];
  const order = Object.keys(FIELD_LABELS);
  return Object.entries(raw as Record<string, Change>).sort(
    ([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99),
  );
}

function show(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return field === "capacity" ? "No limit" : field === "poster_path" ? "No poster" : "(empty)";
  }
  if ((field === "start_at" || field === "end_at") && typeof value === "string") return formatDateTime(value);
  if (field === "poster_path") return "Poster image";
  if (field === "capacity") return `${value} people`;
  return String(value);
}
