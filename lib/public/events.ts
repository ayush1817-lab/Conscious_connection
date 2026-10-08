import "server-only";
import { endOfDublinMonth, endOfDublinWeek } from "@/lib/dublin-time";
import { createPublicClient } from "@/lib/supabase/public";

// Public event columns only. The anon role can't read anything else on events
// (see the initial migration), and RLS limits rows to live events that haven't
// ended. The status and end_at filters below repeat that rule on purpose.
export const PUBLIC_EVENT_COLUMNS = "id, title, county, start_at, end_at, description, poster_path, capacity" as const;

export type PublicEvent = {
  id: string;
  title: string;
  county: string;
  start_at: string;
  end_at: string;
  description: string;
  poster_path: string | null;
  capacity: number | null;
};

export const PAGE_SIZE = 12;
export const FEW_PLACES = 5; // "X places left" shows only below this (spec section 7)

export type When = "week" | "month" | "all";

function visibleEvents() {
  return createPublicClient()
    .from("events")
    .select(PUBLIC_EVENT_COLUMNS, { count: "exact" })
    .eq("status", "live")
    .gt("end_at", new Date().toISOString());
}

export async function getUpcomingEvents(limit: number): Promise<PublicEvent[]> {
  const { data, error } = await visibleEvents().order("start_at").limit(limit);
  if (error) throw error;
  return data ?? [];
}

// P2: soonest first, filtered by county name and time window, PAGE_SIZE per page.
export async function listEvents({ county, when, page }: { county: string | null; when: When; page: number }) {
  let query = visibleEvents();
  if (county) query = query.eq("county", county);
  if (when === "week") query = query.lt("start_at", endOfDublinWeek().toISOString());
  if (when === "month") query = query.lt("start_at", endOfDublinMonth().toISOString());
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.order("start_at").order("id").range(from, from + PAGE_SIZE - 1);
  // Asking for a page past the end is an error in PostgREST; treat it as empty.
  if (error && error.code !== "PGRST103") throw error;
  return { events: data ?? [], total: count ?? 0 };
}

export async function getEvent(id: string): Promise<PublicEvent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await visibleEvents().eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

// Other events to suggest on an event page: same county first, then the soonest.
export async function getSimilarEvents(event: PublicEvent, limit = 3): Promise<PublicEvent[]> {
  const [sameCounty, soonest] = await Promise.all([
    visibleEvents().eq("county", event.county).neq("id", event.id).order("start_at").limit(limit),
    visibleEvents().neq("id", event.id).order("start_at").limit(limit * 2),
  ]);
  const seen = new Set<string>();
  return [...(sameCounty.data ?? []), ...(soonest.data ?? [])]
    .filter((e) => !seen.has(e.id) && seen.add(e.id))
    .slice(0, limit);
}

// Places left for events with a capacity (missing from the map = no limit).
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
