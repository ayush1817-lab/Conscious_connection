"use server";

import { redirect } from "next/navigation";
import type { EventFormState } from "@/components/public/event-form";
import { requireAdmin } from "@/lib/auth/admin";
import { parseRule } from "@/lib/events/recurrence";
import { EDITABLE_STATUSES, FIELD_LABELS, formatFieldValue } from "@/lib/events/status";
import { setFlash } from "@/lib/flash";
import { LOCKABLE_FIELDS } from "@/lib/host/host-event";
import { eventToForm, readEventForm, validateEventForm } from "@/lib/public/event-form";
import { revalidatePublicSite } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";

// Admin event editor: the same form hosts use. Fields that registrations depend
// on (dates, times, repeat, county, address) are locked once anyone has registered.
export async function saveAdminEventEdit(eventId: string, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("events")
    .select(
      "id, title, county, start_at, end_at, description, poster_path, capacity, recurrence_rule, recurrence_until, status, event_private_details(exact_address, host_name, host_email, host_phone, about_group), registrations(count)",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (!current?.event_private_details || !(EDITABLE_STATUSES as readonly string[]).includes(current.status)) {
    return { error: "This event can't be edited any more. Please reload the page." };
  }
  const registered = current.registrations[0]?.count ?? 0;
  const { registrations: _r, event_private_details: currentDetails, status: _s, id: _id, ...currentEvent } = current;

  const values = readEventForm(formData);
  const before = eventToForm(currentEvent, currentDetails);
  if (registered > 0 && LOCKABLE_FIELDS.some((key) => values[key] !== before[key])) {
    return {
      error: "The date, times, repeat, county and address can't be changed because people have already registered.",
      values: { ...values, ...Object.fromEntries(LOCKABLE_FIELDS.map((k) => [k, before[k]])) },
    };
  }

  const { errors, event, details } = validateEventForm(values, { currentPoster: current.poster_path, currentStart: current.start_at });
  if (event && registered && event.capacity !== null && event.capacity < registered) {
    errors.capacity = `${registered} people have already registered, so the limit can't be lower than ${registered}.`;
  }
  if (Object.keys(errors).length || !event || !details) return { fieldErrors: errors, values };

  const old = { ...currentEvent, recurrence_rule: parseRule(currentEvent.recurrence_rule), ...currentDetails } as Record<string, unknown>;
  const next = { ...event, ...details } as Record<string, unknown>;
  const changed = Object.keys(next).filter((key) => {
    const a = old[key] ?? null;
    const b = next[key] ?? null;
    if (key === "start_at" || key === "end_at") return new Date(String(a)).getTime() !== new Date(String(b)).getTime();
    return JSON.stringify(a) !== JSON.stringify(b);
  });
  if (!changed.length) return { notice: "Nothing has changed, so there was nothing to save.", values };

  const [eventUpdate, detailsUpdate] = await Promise.all([
    supabase.from("events").update(event).eq("id", eventId),
    supabase.from("event_private_details").update(details).eq("event_id", eventId),
  ]);
  const error = eventUpdate.error ?? detailsUpdate.error;
  if (error) {
    console.error("Admin event edit failed", error);
    return { error: "The changes couldn't be saved. Please try again.", values };
  }

  await supabase.from("event_activity").insert({
    event_id: eventId,
    actor: "admin",
    action: "Edited the event",
    note: changed.map((key) => `${FIELD_LABELS[key] ?? key}: ${formatFieldValue(key, next[key])}`).join("\n"),
  });
  await setFlash("Event saved.");
  revalidatePublicSite();
  redirect(`/admin/events/${eventId}`);
}
