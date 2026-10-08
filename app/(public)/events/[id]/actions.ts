"use server";

import { redirect } from "next/navigation";
import { registeredEmail, sendEmail } from "@/lib/email";
import { publicEventUrl } from "@/lib/links";
import { isLikelyBot, RATE_LIMITED_MESSAGE, withinRateLimit } from "@/lib/public/spam";
import { checkEmail, checkText, field, type FieldErrors } from "@/lib/public/validate";
import { revalidatePublicSite } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";

export type RegisterState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: { name: string; email: string; consent: boolean };
};

const NAME_MAX = 60;

// P4: register for an event. The database function checks the event is still
// live and has a place, and inserts the registration in one locked step.
export async function registerForEvent(eventId: string, _prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const consent = formData.get("consent") === "yes";
  const values = { name, email, consent };

  // Bots that fill the hidden field get the normal confirmation page and nothing happens.
  if (isLikelyBot(formData)) redirect(`/events/${eventId}/registered`);

  const fieldErrors: FieldErrors = {};
  const nameError = checkText(name, "a name or nickname", NAME_MAX);
  if (nameError) fieldErrors.name = nameError;
  const emailError = checkEmail(email);
  if (emailError) fieldErrors.email = emailError;
  if (!consent) fieldErrors.consent = "Please tick the box to agree, so we can email you the details.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  if (!(await withinRateLimit("register"))) return { error: RATE_LIMITED_MESSAGE, values };

  const db = createAdminClient();
  const { data: result, error } = await db.rpc("register_for_event", { p_event_id: eventId, p_name: name, p_email: email });
  if (error) {
    console.error("register_for_event failed", error);
    return { error: "Something went wrong and you're not registered yet. Please try again.", values };
  }
  if (result === "full") return { error: "Sorry, this event has just filled up.", values };
  if (result === "not_available") return { error: "Sorry, this event is no longer taking registrations.", values };

  // New or repeat registration: (re)send E8 with the address. A repeat never creates a second row.
  const { data: event } = await db
    .from("events")
    .select("title, county, start_at, end_at, event_private_details(exact_address, host_name)")
    .eq("id", eventId)
    .single();
  const details = event?.event_private_details;
  if (event && details) {
    const { data: registrant } = await db
      .from("registrations")
      .select("name")
      .eq("event_id", eventId)
      .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();
    await sendEmail(
      email,
      registeredEmail({
        registrantName: registrant?.name ?? name,
        event,
        exactAddress: details.exact_address,
        hostName: details.host_name,
        eventUrl: publicEventUrl(eventId),
      }),
    );
  }

  if (result === "registered") revalidatePublicSite(); // places left changed
  redirect(`/events/${eventId}/registered`);
}
