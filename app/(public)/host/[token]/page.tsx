import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactRequestForm } from "@/components/public/contact-request-form";
import { EventForm } from "@/components/public/event-form";
import { CalendarIcon, ClockIcon, LockIcon, PinIcon } from "@/components/public/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate, formatDateTime, formatTimeRange, plural } from "@/lib/format";
import {
  LOCKABLE_FIELDS,
  loadContactRequests,
  loadHostEvent,
  loadRegistrantNames,
  lockKeyFieldsWhenRegistered,
  type HostEvent,
} from "@/lib/host/host-event";
import { eventToForm } from "@/lib/public/event-form";
import { cancelHostEvent, requestContactDetails, resubmitEvent, saveHostEdit } from "./actions";

export const metadata: Metadata = {
  title: "Manage your event",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tab?: string; saved?: string; sent?: string; requested?: string }>;
};

// H3 Private host page: one event only, reached through the private link.
export default async function HostPage({ params, searchParams }: Props) {
  const { token } = await params;
  const query = await searchParams;
  const host = await loadHostEvent(token);
  if (!host) notFound(); // H5

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-medium tracking-wide text-muted uppercase">Your private event page</p>
      <h1 className="mt-1 font-heading text-3xl leading-tight font-semibold md:text-4xl">{host.event.title}</h1>
      {host.view === "needs_changes" ? <NeedsChanges host={host} token={token} /> : null}
      {host.view === "pending" ? <Pending host={host} sent={query.sent === "1"} /> : null}
      {host.view === "live" ? <Live host={host} token={token} query={query} /> : null}
    </div>
  );
}

function StatusBar({ tone, children }: { tone: "live" | "waiting" | "action"; children: React.ReactNode }) {
  const tones = { live: "bg-success text-on-primary", waiting: "bg-band text-text", action: "bg-warning text-on-primary" };
  return <p className={`mt-4 inline-flex items-center rounded-full px-4 py-1.5 font-semibold ${tones[tone]}`}>{children}</p>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="mt-4 rounded-card border-2 border-success bg-surface p-4 font-medium">
      {children}
    </p>
  );
}

function NeedsChanges({ host, token }: { host: HostEvent; token: string }) {
  return (
    <>
      <StatusBar tone="action">Needs changes</StatusBar>
      <section aria-labelledby="reason-heading" className="mt-6 rounded-card border-2 border-warning bg-private p-5">
        <h2 id="reason-heading" className="font-heading text-xl font-semibold">
          Karina asked for a few changes
        </h2>
        <p className="mt-2 text-lg whitespace-pre-line">{host.event.status_reason}</p>
      </section>
      <p className="my-6">Update your event below, then send it back. Karina will review it again.</p>
      <EventForm
        action={resubmitEvent.bind(null, token)}
        initial={eventToForm(host.event, host.details)}
        submitLabel="Resubmit for review"
        pendingLabel="Sending…"
        withConsent={false}
      />
    </>
  );
}

function Pending({ host, sent }: { host: HostEvent; sent: boolean }) {
  const e = host.event;
  return (
    <>
      <StatusBar tone="waiting">Waiting for Karina&apos;s review</StatusBar>
      {sent ? <Notice>Thanks! Your changes have been sent to Karina.</Notice> : null}
      <p className="mt-6 text-lg">
        Karina will look at your event soon. If it&apos;s approved, we&apos;ll email you a new private link to manage it.
      </p>
      <dl className="mt-6 space-y-3 rounded-card border border-border bg-surface p-5">
        <SummaryRow label="County">{e.county}</SummaryRow>
        <SummaryRow label="When">
          {formatDate(e.start_at)}, {formatTimeRange(e.start_at, e.end_at)}
        </SummaryRow>
        <SummaryRow label="Description">{e.description}</SummaryRow>
        <SummaryRow label="Places">{e.capacity ? `${e.capacity}` : "No limit"}</SummaryRow>
        <SummaryRow label="Exact address (private)">{host.details.exact_address}</SummaryRow>
      </dl>
    </>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium">{label}</dt>
      <dd className="whitespace-pre-line text-muted">{children}</dd>
    </div>
  );
}

const TABS = [
  { key: "details", label: "Event details" },
  { key: "registrations", label: "Registrations" },
  { key: "contact", label: "Request contact details" },
] as const;

async function Live({ host, token, query }: { host: HostEvent; token: string; query: Awaited<Props["searchParams"]> }) {
  const tab = TABS.some((t) => t.key === query.tab) ? query.tab : "details";
  const [names, requests] = await Promise.all([loadRegistrantNames(host.event.id), loadContactRequests(host.event.id)]);
  const e = host.event;
  const locked = lockKeyFieldsWhenRegistered() && names.length > 0;

  return (
    <>
      <StatusBar tone="live">Live · {names.length} registered</StatusBar>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-muted">
        <span className="inline-flex items-center gap-1.5">
          <PinIcon size={18} /> {e.county}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarIcon size={18} /> {formatDate(e.start_at)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon size={18} /> {formatTimeRange(e.start_at, e.end_at)}
        </span>
      </p>
      <p className="mt-2">
        <Link href={`/events/${e.id}`} className="font-medium text-primary underline underline-offset-4">
          See your event on the website
        </Link>
      </p>
      {query.saved === "1" ? <Notice>Saved. Your changes are live, and Karina has been told.</Notice> : null}

      <nav aria-label="Manage your event" className="mt-6 border-b border-border">
        <ul className="-mb-px flex flex-wrap">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={`/host/${token}${t.key === "details" ? "" : `?tab=${t.key}`}`}
                aria-current={tab === t.key ? "page" : undefined}
                className="flex min-h-tap items-center border-b-3 border-transparent px-4 font-medium text-muted hover:text-text aria-[current=page]:border-primary aria-[current=page]:text-primary"
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        {tab === "details" ? (
          <EventForm
            action={saveHostEdit.bind(null, token)}
            initial={eventToForm(e, host.details)}
            submitLabel="Save changes"
            pendingLabel="Saving…"
            withConsent={false}
            locked={locked ? [...LOCKABLE_FIELDS] : []}
            lockedNote="These can't be changed because people have already registered. To change them, cancel this event and submit a new one."
            footnote="Changes go live immediately. Karina will be notified."
          />
        ) : null}

        {tab === "registrations" ? (
          <section aria-labelledby="regs-heading">
            <h2 id="regs-heading" className="font-heading text-2xl font-semibold">
              {plural(names.length, "person", "people")} registered{e.capacity ? ` of ${e.capacity} places` : ""}
            </h2>
            {names.length ? (
              <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-surface">
                {names.map((name, i) => (
                  <li key={i} className="px-4 py-3">
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-muted">Nobody has registered yet. Share your event to let people know!</p>
            )}
            <p className="mt-4 flex items-start gap-2 text-sm text-muted">
              <LockIcon size={18} className="shrink-0" /> To protect everyone&apos;s privacy you see first names only. If you
              need to reach people, request their contact details.
            </p>
          </section>
        ) : null}

        {tab === "contact" ? (
          <section aria-labelledby="contact-heading" className="space-y-5">
            <h2 id="contact-heading" className="font-heading text-2xl font-semibold">
              Request contact details
            </h2>
            {query.requested === "1" ? <Notice>Request sent. Karina will email you when she decides.</Notice> : null}
            {requests.length ? (
              <ul className="space-y-3">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-card border border-border bg-surface p-4">
                    <p className="font-semibold">
                      {r.status === "requested" ? "Waiting for Karina" : r.status === "shared" ? "Shared by email" : "Declined"}
                      <span className="font-normal text-muted"> · asked {formatDateTime(r.created_at)}</span>
                    </p>
                    <p className="mt-1 text-muted">&ldquo;{r.host_reason}&rdquo;</p>
                    {r.status === "declined" && r.admin_reason ? <p className="mt-1">Karina&apos;s reason: {r.admin_reason}</p> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {requests.some((r) => r.status === "requested") ? null : names.length ? (
              <ContactRequestForm action={requestContactDetails.bind(null, token)} />
            ) : (
              <p className="text-muted">You can ask for contact details once people have registered.</p>
            )}
          </section>
        ) : null}
      </div>

      <section aria-labelledby="cancel-heading" className="mt-12 rounded-card border border-danger/40 bg-surface p-5">
        <h2 id="cancel-heading" className="font-heading text-xl font-semibold">
          Cancel this event
        </h2>
        <p className="mt-1 mb-4 text-muted">
          {names.length ? `The ${plural(names.length, "person", "people")} registered will be emailed.` : "Nobody has registered yet."}
        </p>
        <ConfirmDialog
          trigger="Cancel event"
          title="Cancel this event?"
          variant="danger"
          confirmVariant="destructive"
          confirmLabel="Cancel event"
          cancelLabel="Keep event"
          action={cancelHostEvent.bind(null, token)}
        >
          <p>
            {names.length
              ? `The ${plural(names.length, "person", "people")} registered will be emailed. This can't be undone.`
              : "It will be removed from the website. This can't be undone."}
          </p>
        </ConfirmDialog>
      </section>
    </>
  );
}
