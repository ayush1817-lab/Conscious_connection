import type { Database } from "@/lib/supabase/database.types";

export type EventStatus = Database["public"]["Enums"]["event_status"];

// Expired events (and every other status) stay visible to the admin for this
// many days after they end; the retention job then deletes their private data.
export const ADMIN_RETENTION_DAYS = 7;

export function retentionCutoff(now = Date.now()) {
  return new Date(now - ADMIN_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// Plain-language names shown to Karina.
export const STATUS_LABELS: Record<EventStatus, string> = {
  pending: "New request",
  needs_changes: "Needs changes",
  declined: "Declined",
  live: "Live",
  cancelled: "Cancelled",
  taken_down: "Taken down",
};

// "Expired" is derived: a live event whose end time has passed.
export function displayStatus(status: EventStatus, endAt: string, now = Date.now()) {
  if (status === "live" && new Date(endAt).getTime() < now) return "Ended";
  return STATUS_LABELS[status];
}

// Labels for fields in host edits (before -> after).
export const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  county: "County",
  start_at: "Start",
  end_at: "End",
  description: "Description",
  poster_path: "Poster",
  capacity: "Capacity",
  exact_address: "Exact address",
  host_name: "Host name",
  host_email: "Host email",
  host_phone: "Host phone",
  about_group: "About the group",
  emergency_contact_name: "Emergency contact name",
  emergency_contact_phone: "Emergency contact phone",
};
