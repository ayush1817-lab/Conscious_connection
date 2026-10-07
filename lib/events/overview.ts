import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { FIELD_LABELS, retentionCutoff, type EventStatus } from "./status";

type AttentionType = Database["public"]["Enums"]["attention_type"];

export type EventCard = {
  id: string;
  title: string;
  county: string;
  startAt: string;
  endAt: string;
  status: EventStatus;
  posterPath: string | null;
  submittedAt: string;
  isNew: boolean;
  hostName: string | null;
  registered: number;
};

export type AttentionRow = {
  id: string;
  eventId: string;
  type: AttentionType;
  needsDecision: boolean;
  label: "Needs your decision" | "Update";
  heading: string;
  eventTitle: string;
  county: string;
  summary: string;
  createdAt: string;
};

export type OtherStatus = Exclude<EventStatus, "pending" | "live">;

export type EventsOverview = {
  counts: { live: number; newRequests: number; attention: number };
  attention: AttentionRow[];
  newRequests: EventCard[];
  upcoming: EventCard[];
  past: EventCard[];
  other: Record<OtherStatus, EventCard[]>;
};

const EVENT_FIELDS =
  "id, title, county, start_at, end_at, status, poster_path, submitted_at, opened_by_admin_at, event_private_details(host_name), registrations(count)";

type EventRow = {
  id: string;
  title: string;
  county: string;
  start_at: string;
  end_at: string;
  status: EventStatus;
  poster_path: string | null;
  submitted_at: string;
  opened_by_admin_at: string | null;
  event_private_details: { host_name: string } | null;
  registrations: { count: number }[];
};

function toCard(row: EventRow): EventCard {
  return {
    id: row.id,
    title: row.title,
    county: row.county,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    posterPath: row.poster_path,
    submittedAt: row.submitted_at,
    isNew: row.opened_by_admin_at === null,
    hostName: row.event_private_details?.host_name ?? null,
    registered: row.registrations[0]?.count ?? 0,
  };
}

// Everything A1 and A2 show. Events that ended more than 7 days ago are hidden
// from every admin list (their private data is removed by the retention job).
export async function getEventsOverview(): Promise<EventsOverview> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const cutoff = retentionCutoff();

  const [eventsRes, attentionRes] = await Promise.all([
    supabase.from("events").select(EVENT_FIELDS).gte("end_at", cutoff).returns<EventRow[]>(),
    supabase
      .from("attention_items")
      .select("id, event_id, type, ref_id, needs_decision, created_at, events!inner(title, county, end_at)")
      .is("resolved_at", null)
      .gte("events.end_at", cutoff)
      .order("created_at", { ascending: false }),
  ]);
  if (eventsRes.error) throw eventsRes.error;
  if (attentionRes.error) throw attentionRes.error;

  const cards = eventsRes.data.map(toCard);
  const byStart = (a: EventCard, b: EventCard) => a.startAt.localeCompare(b.startAt);

  const newRequests = cards
    .filter((e) => e.status === "pending")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const upcoming = cards.filter((e) => e.status === "live" && e.endAt >= now).sort(byStart);
  const past = cards
    .filter((e) => e.status === "live" && e.endAt < now)
    .sort((a, b) => b.endAt.localeCompare(a.endAt));
  const other: Record<OtherStatus, EventCard[]> = {
    needs_changes: [],
    declined: [],
    cancelled: [],
    taken_down: [],
  };
  for (const card of cards) {
    if (card.status in other) other[card.status as OtherStatus].push(card);
  }
  for (const list of Object.values(other)) list.sort(byStart);

  const attention = await describeAttention(supabase, attentionRes.data);

  return {
    counts: { live: upcoming.length, newRequests: newRequests.length, attention: attention.length },
    attention,
    newRequests,
    upcoming,
    past,
    other,
  };
}

type AttentionQueryRow = {
  id: string;
  event_id: string;
  type: AttentionType;
  ref_id: string | null;
  needs_decision: boolean;
  created_at: string;
  events: { title: string; county: string };
};

async function describeAttention(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: AttentionQueryRow[],
): Promise<AttentionRow[]> {
  const refIds = (type: AttentionType) => items.filter((i) => i.type === type && i.ref_id).map((i) => i.ref_id!);
  const editIds = refIds("host_edited");
  const requestIds = refIds("contact_request");

  const [edits, requests] = await Promise.all([
    editIds.length ? supabase.from("event_edits").select("id, changes").in("id", editIds) : { data: [] },
    requestIds.length ? supabase.from("contact_requests").select("id, host_reason").in("id", requestIds) : { data: [] },
  ]);
  const editById = new Map((edits.data ?? []).map((e) => [e.id, e.changes as Record<string, unknown>]));
  const reasonById = new Map((requests.data ?? []).map((r) => [r.id, r.host_reason]));

  return items.map((item) => {
    const base = {
      id: item.id,
      eventId: item.event_id,
      type: item.type,
      needsDecision: item.needs_decision,
      eventTitle: item.events.title,
      county: item.events.county,
      createdAt: item.created_at,
    };
    switch (item.type) {
      case "contact_request": {
        const reason = item.ref_id ? reasonById.get(item.ref_id) : undefined;
        return {
          ...base,
          label: "Needs your decision",
          heading: "Contact detail request",
          summary: reason ? `“${truncate(reason, 90)}”` : "The host asked for registrants' contact details.",
        };
      }
      case "host_edited": {
        const changes = item.ref_id ? editById.get(item.ref_id) : undefined;
        // jsonb doesn't keep key order, so list fields in form order.
        const order = Object.keys(FIELD_LABELS);
        const fields = Object.keys(changes ?? {})
          .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
          .map((f) => (FIELD_LABELS[f] ?? f).toLowerCase());
        return {
          ...base,
          label: "Update",
          heading: "Host edited event",
          summary: fields.length ? `Changed ${listJoin(fields)}.` : "The host changed some details.",
        };
      }
      case "host_cancelled":
        return {
          ...base,
          label: "Update",
          heading: "Host cancelled event",
          summary: "Registered people have been emailed.",
        };
    }
  });
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function listJoin(items: string[]) {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
