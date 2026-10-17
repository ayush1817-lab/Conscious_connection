import "server-only";
import { timingSafeEqual } from "node:crypto";
import { hashHostToken } from "@/lib/events/host-token";
import { createAdminClient } from "@/lib/supabase/admin";

// Resolves a private host link (/host/[token]) to its event (spec section 9).
// The URL holds the raw token; only its SHA-256 hash is stored. Never log tokens.

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url

export type HostView = "needs_changes" | "pending" | "live";

export async function loadHostEvent(token: string) {
  if (!TOKEN_SHAPE.test(token)) return null;
  const hash = hashHostToken(token);
  const db = createAdminClient();
  const { data: event } = await db
    .from("events")
    .select(
      "id, title, county, start_at, end_at, series_end_at, recurrence_rule, recurrence_until, description, poster_path, capacity, status, status_reason, host_edit_token_hash, event_private_details(exact_address, host_name, host_email, host_phone, about_group)",
    )
    .eq("host_edit_token_hash", hash)
    .maybeSingle();
  // The lookup is by hash; compare again in constant time before trusting it.
  if (!event?.host_edit_token_hash || !event.event_private_details) return null;
  const stored = Buffer.from(event.host_edit_token_hash, "hex");
  const given = Buffer.from(hash, "hex");
  if (stored.length !== given.length || !timingSafeEqual(stored, given)) return null;

  // A recurring event has ended when its last date has.
  const ended = new Date(event.series_end_at).getTime() <= Date.now();
  const view: HostView | null =
    event.status === "needs_changes" ? "needs_changes" : event.status === "pending" ? "pending" : event.status === "live" && !ended ? "live" : null;
  if (!view) return null; // ended, cancelled, taken down or declined: H5

  const { host_edit_token_hash: _hash, event_private_details: details, ...rest } = event;
  return { hash, view, event: rest, details };
}

export type HostEvent = NonNullable<Awaited<ReturnType<typeof loadHostEvent>>>;

// Names (never emails) and the date each person registered for.
export async function loadRegistrantNames(eventId: string) {
  const { data } = await createAdminClient()
    .from("registrations")
    .select("name, occurrence_start")
    .eq("event_id", eventId)
    .order("occurrence_start")
    .order("created_at");
  return data ?? [];
}

export async function loadContactRequests(eventId: string) {
  const { data } = await createAdminClient()
    .from("contact_requests")
    .select("id, host_reason, status, admin_reason, created_at, decided_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Spec section 9: once anyone has registered, date, times, county and address
// are locked. Still being confirmed, so it can be switched off.
export function lockKeyFieldsWhenRegistered() {
  return process.env.LOCK_KEY_FIELDS_WHEN_REGISTERED !== "false";
}

export const LOCKABLE_FIELDS = ["date", "start_time", "end_time", "repeats", "repeat_until", "county", "exact_address"] as const;
