import { parseRule } from "@/lib/events/recurrence";
import { formatDateTime } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

export type EventStatus = Database["public"]["Enums"]["event_status"];

// Expired events (and every other status) stay visible to the admin for this
// many days after they end; the retention job then deletes their private data.
export const ADMIN_RETENTION_DAYS = 7;

export function retentionCutoff(now = Date.now()) {
  return new Date(now - ADMIN_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// Statuses the admin event editor can change (not ended, declined or cancelled ones).
export const EDITABLE_STATUSES = ["pending", "needs_changes", "live"] as const;

// Plain-language names shown to the admin.
export const STATUS_LABELS: Record<EventStatus, string> = {
  pending: "New request",
  needs_changes: "Needs changes",
  declined: "Declined",
  live: "Live",
  cancelled: "Cancelled",
  taken_down: "Taken down",
};

// "Expired" is derived: a live event whose end time has passed.
// endAt is when the event is over (series_end_at; "infinity" never ends).
export function displayStatus(status: EventStatus, endAt: string, now = Date.now()) {
  if (status === "live" && endAt !== "infinity" && new Date(endAt).getTime() < now) return "Ended";
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
  recurrence_rule: "Repeats",
  recurrence_until: "Last date",
  external_registration_url: "Registration link",
  exact_address: "Exact address",
  host_name: "Host name",
  host_email: "Host email",
  host_phone: "Host phone",
  about_group: "About the group",
  emergency_contact_name: "Emergency contact name",
  emergency_contact_phone: "Emergency contact phone",
};

// A before/after value from a host edit, in plain words.
export function formatFieldValue(field: string, value: unknown): string {
  if (field === "recurrence_rule") return parseRule(value) ? "Every week" : "Doesn't repeat";
  if (value === null || value === undefined || value === "") {
    return field === "capacity" ? "No limit" : field === "poster_path" ? "No poster" : field === "recurrence_until" ? "No end date" : field === "external_registration_url" ? "Register on this site" : "(empty)";
  }
  if ((field === "start_at" || field === "end_at") && typeof value === "string") return formatDateTime(value);
  if (field === "poster_path") return "Poster image";
  if (field === "capacity") return `${value} people`;
  return String(value);
}
