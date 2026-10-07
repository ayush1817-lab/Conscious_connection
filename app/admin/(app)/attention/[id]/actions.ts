"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { contactDetailsDeclinedEmail, contactDetailsSharedEmail, sendEmail } from "@/lib/email";
import { AttentionError, decideContactRequest } from "@/lib/events/attention";
import { REASON_MAX_LENGTH } from "@/lib/events/transitions";
import { setFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";

type FormState = { error?: string };

async function requestContext(supabase: Awaited<ReturnType<typeof createClient>>, itemId: string) {
  const { data } = await supabase
    .from("attention_items")
    .select(
      "event_id, events!inner(title, county, start_at, end_at, event_private_details(host_name, host_email), registrations(name, email, created_at))",
    )
    .eq("id", itemId)
    .eq("type", "contact_request")
    .maybeSingle();
  return data;
}

async function finish(sent: { ok: boolean }, done: string, hostName: string, hostEmail: string): Promise<never> {
  if (sent.ok) {
    await setFlash(`${done} ${hostName} has been emailed.`);
  } else {
    await setFlash(`${done} But the email to ${hostName} couldn't be sent, so please contact them at ${hostEmail}.`, "error");
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/events");
}

// A7 contact request → Share contact details (confirmation). Sends E10 with
// every registrant's name and email.
export async function shareContactDetails(itemId: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const ctx = await requestContext(supabase, itemId);
  const host = ctx?.events.event_private_details;
  if (!ctx || !host) return { error: "This request can't be found, or the host's details have been deleted." };
  const registrants = [...ctx.events.registrations].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!registrants.length) return { error: "Nobody has registered yet, so there are no details to share." };

  try {
    await decideContactRequest(supabase, itemId, { status: "shared" });
  } catch (error) {
    if (error instanceof AttentionError) return { error: error.message };
    throw error;
  }

  const sent = await sendEmail(
    host.host_email,
    contactDetailsSharedEmail({
      hostName: host.host_name,
      event: ctx.events,
      registrants: registrants.map(({ name, email }) => ({ name, email })),
    }),
  );
  return finish(sent, "Contact details shared.", host.host_name, host.host_email);
}

// A7 contact request → Decline (reason dialog). Sends E10 with the reason.
export async function declineContactRequest(itemId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Please write a reason. It will be emailed to the host." };
  if (reason.length > REASON_MAX_LENGTH) return { error: `Please keep the reason under ${REASON_MAX_LENGTH} characters.` };

  const supabase = await createClient();
  const ctx = await requestContext(supabase, itemId);
  const host = ctx?.events.event_private_details;
  if (!ctx || !host) return { error: "This request can't be found, or the host's details have been deleted." };

  try {
    await decideContactRequest(supabase, itemId, { status: "declined", reason });
  } catch (error) {
    if (error instanceof AttentionError) return { error: error.message };
    throw error;
  }

  const sent = await sendEmail(
    host.host_email,
    contactDetailsDeclinedEmail({ hostName: host.host_name, event: ctx.events, reason }),
  );
  return finish(sent, "Request declined.", host.host_name, host.host_email);
}
