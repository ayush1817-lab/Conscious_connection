"use server";

import { redirect } from "next/navigation";
import { registeredEmail, sendEmail, sendQuietly } from "@/lib/email";
import { publicEventUrl } from "@/lib/links";
import { isLikelyBot, RATE_LIMITED_MESSAGE, withinRateLimit } from "@/lib/public/spam";
import { checkEmail, checkText, field, type FieldErrors } from "@/lib/public/validate";
import { revalidatePublicSite } from "@/lib/revalidate";
import { isOccurrence, parseRule, upcomingOccurrences } from "@/lib/events/recurrence";
import { createAdminClient } from "@/lib/supabase/admin";

export type RegisterState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: { name: string; email: string; consent: boolean; occurrence?: string };
};

const NAME_MAX = 60;

// P4: register for an event. The database function checks the event is still
// live and has a place, and inserts the registration in one locked step.
export async function registerForEvent(eventId: string, _prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const consent = formData.get("consent") === "yes";
  // Recurring events: the date picked (an ISO start time). One-off events don't send it.
  const occurrence = field(formData, "occurrence") || undefined;
  const values = { name, email, consent, occurrence };

  // Bots that fill the hidden field get the normal confirmation page and nothing happens.
  if (isLikelyBot(formData)) redirect(`/events/${eventId}/registered`);

  const fieldErrors: FieldErrors = {};
  const nameError = checkText(name, "a name or nickname", NAME_MAX);
  if (nameError) fieldErrors.name = nameError;
  const emailError = checkEmail(email);
  if (emailError) fieldErrors.email = emailError;
  if (!consent) fieldErrors.consent = "Please tick the box to agree, so we can email you the details.";

  const db = createAdminClient();
  const { data: series } = await db
    .from("events")
    .select("start_at, end_at, recurrence_rule, recurrence_until")
    .eq("id", eventId)
    .maybeSingle();
  const recurring = Boolean(series && parseRule(series.recurrence_rule));
  if (recurring && (!occurrence || !isOccurrence(series!, occurrence))) fieldErrors.occurrence = "Please choose a date.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  if (!(await withinRateLimit("register"))) return { error: RATE_LIMITED_MESSAGE, values };

  // The date registered for: the one picked, or (one-off events) the event's own date.
  const occurrenceStart = recurring ? new Date(occurrence!).toISOString() : series ? upcomingOccurrences(series, 1)[0]?.start : undefined;
  const { data: result, error } = await db.rpc("register_for_event", {
    p_event_id: eventId,
    p_name: name,
    p_email: email,
    p_occurrence_start: occurrenceStart ?? null,
  });
  if (error) {
    console.error("register_for_event failed", error);
    return { error: "Something went wrong and you're not registered yet. Please try again.", values };
  }
  if (result === "full") return { error: recurring ? "Sorry, that date has just filled up. Please pick another." : "Sorry, this event has just filled up.", values };
  if (result === "not_available")
    return { error: recurring ? "Sorry, that date is no longer taking registrations." : "Sorry, this event is no longer taking registrations.", values };

  // New or repeat registration: (re)send E8 with the address. A repeat never creates a second row.
  await sendQuietly("registration confirmation", async () => {
    const { data: event } = await db
      .from("events")
      .select("title, county, start_at, end_at, recurrence_rule, recurrence_until, event_private_details(exact_address, host_name)")
      .eq("id", eventId)
      .single();
    const details = event?.event_private_details;
    if (event && details) {
      const { data: registrant } = await db
        .from("registrations")
        .select("name")
        .eq("event_id", eventId)
        .eq("occurrence_start", occurrenceStart ?? event.start_at)
        .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
        .maybeSingle();
      await sendEmail(
        email,
        registeredEmail({
          registrantName: registrant?.name ?? name,
          // The date they registered for.
          event: occurrenceStart ? { ...event, ...occurrenceTimes(event, occurrenceStart) } : event,
          exactAddress: details.exact_address,
          hostName: details.host_name,
          eventUrl: publicEventUrl(eventId),
        }),
      );
    } else {
      console.error(JSON.stringify({ event: "email_failed", template: "E8", eventId, error: "Event or its private details not found" }));
    }
  });

  if (result === "registered") revalidatePublicSite(); // places left changed
  redirect(`/events/${eventId}/registered`);
}

function occurrenceTimes(event: { start_at: string; end_at: string }, start: string) {
  const duration = new Date(event.end_at).getTime() - new Date(event.start_at).getTime();
  return { start_at: start, end_at: new Date(new Date(start).getTime() + duration).toISOString() };
}
