"use server";

import { after } from "next/server";
import { approvedEmail, needsChangesEmail, sendEmail } from "@/lib/email";
import { generateHostToken } from "@/lib/events/host-token";
import { hostLinkUrl, publicEventUrl } from "@/lib/links";
import { isLikelyBot, RATE_LIMITED_MESSAGE, withinRateLimit } from "@/lib/public/spam";
import { checkEmail, field } from "@/lib/public/validate";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResendState = { done?: boolean; error?: string; emailError?: string; email?: string };

// H6: email fresh private links. The reply is the same whether or not the
// email belongs to a host, and the lookup and emails run after the response is
// sent, so neither the message nor the timing gives anything away.
export async function resendHostLinks(_prev: ResendState, formData: FormData): Promise<ResendState> {
  const email = field(formData, "email").toLowerCase();
  const emailError = checkEmail(email);
  if (emailError) return { emailError, email };
  if (isLikelyBot(formData)) return { done: true };
  if (!(await withinRateLimit("resend"))) return { error: RATE_LIMITED_MESSAGE, email };

  after(() => sendFreshLinks(email));
  return { done: true };
}

async function sendFreshLinks(email: string) {
  const db = createAdminClient();
  const { data: events, error } = await db
    .from("events")
    .select("id, title, county, start_at, end_at, status, status_reason, event_private_details!inner(host_name, host_email)")
    .ilike("event_private_details.host_email", email.replace(/[\\%_]/g, "\\$&"))
    .or(`and(status.eq.live,end_at.gt.${new Date().toISOString()}),status.eq.needs_changes`);
  if (error) {
    console.error("Resend lookup failed", error);
    return;
  }

  for (const event of events ?? []) {
    // A new token per event; the old link stops working.
    const { token, hash } = generateHostToken();
    const { data: updated } = await db
      .from("events")
      .update({ host_edit_token_hash: hash })
      .eq("id", event.id)
      .eq("status", event.status)
      .select("id")
      .maybeSingle();
    if (!updated) continue;

    const hostName = event.event_private_details.host_name;
    await db.from("event_activity").insert({
      event_id: event.id,
      actor: "host",
      action: "Asked for a new private link",
      note: "The old link no longer works.",
    });
    await sendEmail(
      event.event_private_details.host_email,
      event.status === "live"
        ? approvedEmail({ hostName, event, eventUrl: publicEventUrl(event.id), hostUrl: hostLinkUrl(token), resent: true })
        : needsChangesEmail({ hostName, event, reason: event.status_reason ?? "", editUrl: hostLinkUrl(token) }),
    );
  }
}
