import "server-only";
import { endOfDublinMonth, endOfDublinWeek } from "@/lib/dublin-time";
import { createPublicClient } from "@/lib/supabase/public";

// Public event columns only, read from the event_listing view (see the
// recurring events migration). The view runs with the caller's rights, so RLS
// still limits rows to live events whose series hasn't ended; it adds the next
// occurrence of each event. The filters below repeat that rule on purpose.
const LISTING_COLUMNS =
  "id, title, county, start_at, end_at, description, poster_path, capacity, recurrence_rule, recurrence_until, next_start_at, next_end_at" as const;

export type PublicEvent = {
  id: string;
  title: string;
  county: string;
  // The next occurrence (for a one-off event, simply its date and time).
  start_at: string;
  end_at: string;
  // The first occurrence of the series, which the rule counts from.
  series_start_at: string;
  series_first_end_at: string;
  description: string;
  poster_path: string | null;
  capacity: number | null;
  recurrence_rule: unknown;
  recurrence_until: string | null;
};

type ListingRow = {
  id: string;
  title: string;
  county: string;
  start_at: string;
  end_at: string;
  description: string;
  poster_path: string | null;
  capacity: number | null;
  recurrence_rule: unknown;
  recurrence_until: string | null;
  next_start_at: string;
  next_end_at: string;
};

function toPublicEvent(row: ListingRow): PublicEvent {
  return {
    id: row.id,
    title: row.title,
    county: row.county,
    start_at: row.next_start_at,
    end_at: row.next_end_at,
    series_start_at: row.start_at,
    series_first_end_at: row.end_at,
    description: row.description,
    poster_path: row.poster_path,
    capacity: row.capacity,
    recurrence_rule: row.recurrence_rule,
    recurrence_until: row.recurrence_until,
  };
}

// The series fields that lib/events/recurrence.ts works from.
export function seriesOf(event: PublicEvent) {
  return {
    start_at: event.series_start_at,
    end_at: event.series_first_end_at,
    recurrence_rule: event.recurrence_rule,
    recurrence_until: event.recurrence_until,
  };
}

export const PAGE_SIZE = 12;
export const FEW_PLACES = 5; // "X places left" shows only below this (spec section 7)

export type When = "week" | "month" | "all";

function visibleEvents() {
  return createPublicClient()
    .from("event_listing")
    .select(LISTING_COLUMNS, { count: "exact" })
    .eq("status", "live")
    .gt("next_end_at", new Date().toISOString());
}

function rows(data: unknown): PublicEvent[] {
  return ((data as ListingRow[] | null) ?? []).map(toPublicEvent);
}

export async function getUpcomingEvents(limit: number): Promise<PublicEvent[]> {
  const { data, error } = await visibleEvents().order("next_start_at").limit(limit);
  if (error) throw error;
  return rows(data);
}

// P2: soonest first, filtered by county name and time window, PAGE_SIZE per page.
// A recurring event is listed once, at its next date.
export async function listEvents({ county, when, page }: { county: string | null; when: When; page: number }) {
  let query = visibleEvents();
  if (county) query = query.eq("county", county);
  if (when === "week") query = query.lt("next_start_at", endOfDublinWeek().toISOString());
  if (when === "month") query = query.lt("next_start_at", endOfDublinMonth().toISOString());
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.order("next_start_at").order("id").range(from, from + PAGE_SIZE - 1);
  // Asking for a page past the end is an error in PostgREST; treat it as empty.
  if (error && error.code !== "PGRST103") throw error;
  return { events: rows(data), total: count ?? 0 };
}

export async function getEvent(id: string): Promise<PublicEvent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await visibleEvents().eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toPublicEvent(data as ListingRow) : null;
}

// Other events to suggest on an event page: same county first, then the soonest.
export async function getSimilarEvents(event: PublicEvent, limit = 3): Promise<PublicEvent[]> {
  const [sameCounty, soonest] = await Promise.all([
    visibleEvents().eq("county", event.county).neq("id", event.id).order("next_start_at").limit(limit),
    visibleEvents().neq("id", event.id).order("next_start_at").limit(limit * 2),
  ]);
  const seen = new Set<string>();
  return [...rows(sameCounty.data), ...rows(soonest.data)]
    .filter((e) => !seen.has(e.id) && seen.add(e.id))
    .slice(0, limit);
}

// Places left on given dates of one event (missing from the map = no limit).
export async function getOccurrencePlacesLeft(id: string, starts: string[]): Promise<Map<string, number>> {
  if (!starts.length) return new Map();
  const { data, error } = await createPublicClient().rpc("occurrence_places_left", { p_event_id: id, p_starts: starts });
  if (error) throw error;
  return new Map((data ?? []).map((row) => [new Date(row.occurrence_start).toISOString(), row.places_left]));
}

// Places left on each event's next date, for events with a capacity (missing = no limit).
export async function getPlacesLeft(ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const { data, error } = await createPublicClient().rpc("event_places_left", { event_ids: ids });
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.event_id, row.places_left]));
}

// The badge an event card shows, if any.
export function placesBadge(placesLeft: number | undefined) {
  if (placesLeft === undefined) return undefined;
  if (placesLeft === 0) return { label: "Event full", full: true };
  if (placesLeft < FEW_PLACES) return { label: placesLeft === 1 ? "1 place left" : "Few places left", full: false };
  return undefined;
}
