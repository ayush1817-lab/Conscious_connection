"use server";

import { redirect } from "next/navigation";
import type { EventFormState } from "@/components/public/event-form";
import { notifyAdmins } from "@/lib/email/admin-recipients";
import { contactRequestEmail, eventCancelledEmail, hostCancelledEmail, hostEditedEmail, newSubmissionEmail, sendEmail } from "@/lib/email";
import { FIELD_LABELS, formatFieldValue } from "@/lib/events/status";
import { LOCKABLE_FIELDS, loadHostEvent, lockKeyFieldsWhenRegistered } from "@/lib/host/host-event";
import { adminAttentionUrl, adminEventUrl } from "@/lib/links";
import { eventToForm, readEventForm, validateEventForm, type EventFields, type PrivateFields } from "@/lib/public/event-form";
import { field } from "@/lib/public/validate";
import { revalidatePublicSite } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

const GONE = "This link is no longer active. Please reload the page.";

// H3 (needs changes): fix the event and send it back to Karina.
export async function resubmitEvent(token: string, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const host = await loadHostEvent(token);
  if (!host || host.view !== "needs_changes") return { error: GONE };

  const values = readEventForm(formData);
  const { errors, event, details } = validateEventForm(values, { currentPoster: host.event.poster_path });
  if (Object.keys(errors).length || !event || !details) return { fieldErrors: errors, values };

  const db = createAdminClient();
  const { data: ok, error } = await db.rpc("host_resubmit_event", {
    p_event_id: host.event.id,
    p_token_hash: host.hash,
    p_event: event,
    p_details: details,
  });
  if (error || !ok) {
    if (error) console.error("host_resubmit_event failed", error);
    return { error: "Your changes couldn't be sent. Please reload the page and try again.", values };
  }

  await notifyAdmins(
    newSubmissionEmail({ event, hostName: details.host_name, about: details.about_group, resubmitted: true, adminUrl: adminEventUrl(host.event.id) }),
  );
  revalidatePublicSite();
  redirect(`/host/${token}?sent=1`);
}

// H3 (live): save changes. Only changed fields are written, and Karina gets a before/after.
export async function saveHostEdit(token: string, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const host = await loadHostEvent(token);
  if (!host || host.view !== "live") return { error: GONE };

  const db = createAdminClient();
  const { count: registered } = await db.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", host.event.id);
  const values = readEventForm(formData);
  const current = eventToForm(host.event, host.details);

  // Locked fields are checked here, whatever the browser sent (spec section 12).
  const locked = lockKeyFieldsWhenRegistered() && (registered ?? 0) > 0;
  if (locked && LOCKABLE_FIELDS.some((key) => values[key] !== current[key])) {
    return {
      error: "The date, times, county and address can't be changed because people have already registered.",
      values: { ...values, ...Object.fromEntries(LOCKABLE_FIELDS.map((k) => [k, current[k]])) },
    };
  }

  const { errors, event, details } = validateEventForm(values, { currentPoster: host.event.poster_path });
  // Keeping the current date is fine even though it's no longer checked as "in the future" by the host.
  if (event && registered && event.capacity !== null && event.capacity < registered) {
    errors.capacity = `${registered} people have already registered, so the limit can't be lower than ${registered}.`;
  }
  if (Object.keys(errors).length || !event || !details) return { fieldErrors: errors, values };

  const before: EventFields & PrivateFields = { ...host.event, ...host.details };
  const after: EventFields & PrivateFields = { ...event, ...details };
  const changes: Record<string, { before: Json; after: Json }> = {};
  for (const key of Object.keys(after) as (keyof typeof after)[]) {
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    const same = key === "start_at" || key === "end_at" ? new Date(String(a)).getTime() === new Date(String(b)).getTime() : a === b;
    if (!same) changes[key] = { before: a, after: b };
  }
  if (!Object.keys(changes).length) return { notice: "Nothing has changed, so there was nothing to save.", values };

  const pick = <T extends object>(obj: T) =>
    Object.fromEntries(Object.entries(obj).filter(([k]) => k in changes)) as Partial<T>;
  const { data: itemId, error } = await db.rpc("host_edit_event", {
    p_event_id: host.event.id,
    p_token_hash: host.hash,
    p_event: pick(event),
    p_details: pick(details),
    p_changes: changes,
  });
  if (error || !itemId) {
    if (error) console.error("host_edit_event failed", error);
    return { error: "Your changes couldn't be saved. Please reload the page and try again.", values };
  }

  await notifyAdmins(
    hostEditedEmail({
      event,
      changes: Object.entries(changes).map(([key, c]) => ({
        label: FIELD_LABELS[key] ?? key,
        before: formatFieldValue(key, c.before),
        after: formatFieldValue(key, c.after),
      })),
      adminUrl: adminAttentionUrl(itemId),
    }),
  );
  revalidatePublicSite();
  redirect(`/host/${token}?saved=1`);
}

export type ContactState = { error?: string; reasonError?: string };

// H3 (live): ask Karina for registrants' contact details.
export async function requestContactDetails(token: string, _prev: ContactState, formData: FormData): Promise<ContactState> {
  const host = await loadHostEvent(token);
  if (!host || host.view !== "live") return { error: GONE };
  const reason = field(formData, "reason");
  if (!reason) return { reasonError: "Tell Karina why you need the contact details." };
  if (reason.length > 500) return { reasonError: `Please keep this under 500 characters (it's ${reason.length}).` };

  const { data: itemId, error } = await createAdminClient().rpc("host_request_contact", {
    p_event_id: host.event.id,
    p_token_hash: host.hash,
    p_reason: reason,
  });
  if (error) console.error("host_request_contact failed", error);
  if (!itemId) return { error: "You already have a request waiting for Karina. You'll get an email when she decides." };

  await notifyAdmins(contactRequestEmail({ event: host.event, reason, adminUrl: adminAttentionUrl(itemId) }));
  revalidatePublicSite();
  redirect(`/host/${token}?tab=contact&requested=1`);
}

// H4: cancel the event. Every registrant gets E9 and Karina gets E7.
export async function cancelHostEvent(token: string, _prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  if (formData.get("confirmed") !== "yes") return { error: "Please confirm first." };
  const host = await loadHostEvent(token);
  if (!host || host.view !== "live") return { error: GONE };

  const db = createAdminClient();
  const { data: itemId, error } = await db.rpc("host_cancel_event", { p_event_id: host.event.id, p_token_hash: host.hash });
  if (error || !itemId) {
    if (error) console.error("host_cancel_event failed", error);
    return { error: "The event couldn't be cancelled. Please reload the page and try again." };
  }

  const { data: registrants } = await db.from("registrations").select("name, email").eq("event_id", host.event.id);
  for (const r of registrants ?? []) {
    await sendEmail(r.email, eventCancelledEmail({ registrantName: r.name, event: host.event }));
  }
  await notifyAdmins(hostCancelledEmail({ event: host.event, registered: registrants?.length ?? 0, adminUrl: adminAttentionUrl(itemId) }));
  revalidatePublicSite();
  redirect(`/host/cancelled?n=${registrants?.length ?? 0}`);
}
