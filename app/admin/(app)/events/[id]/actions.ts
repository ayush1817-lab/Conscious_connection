"use server";

import { revalidatePublicSite } from "@/lib/revalidate";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import {
  approvedEmail,
  declinedEmail,
  eventCancelledEmail,
  needsChangesEmail,
  sendEmail,
  takenDownEmail,
} from "@/lib/email";
import { closeEventAttention } from "@/lib/events/attention";
import { HostLinkError, regenerateHostLink } from "@/lib/events/host-link";
import { TransitionError, transitionEvent } from "@/lib/events/transitions";
import { setFlash } from "@/lib/flash";
import { hostLinkUrl, publicEventUrl } from "@/lib/links";
import { createClient } from "@/lib/supabase/server";
import { hostLinkCookie } from "./host-link-cookie";

export type ReasonFormState = { error?: string };

async function hostContact(supabase: Awaited<ReturnType<typeof createClient>>, eventId: string) {
  const { data } = await supabase
    .from("event_private_details")
    .select("host_name, host_email")
    .eq("event_id", eventId)
    .maybeSingle();
  return data;
}

// A3 Approve → A5. Emails the host their private link (E4).
export async function approveEvent(eventId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const host = await hostContact(supabase, eventId);

  const fail = async (message: string) => {
    await setFlash(message, "error");
    revalidatePublicSite();
    redirect(`/admin/events/${eventId}`);
  };
  if (!host) return fail("This request has no host details, so the host can't be emailed.");

  let result;
  try {
    result = await transitionEvent(supabase, { eventId, to: "live", actor: "admin" });
  } catch (error) {
    if (!(error instanceof TransitionError)) throw error;
    return fail(error.message);
  }

  const token = result.hostToken!;
  const sent = await sendEmail(
    host.host_email,
    approvedEmail({
      hostName: host.host_name,
      event: result.event,
      eventUrl: publicEventUrl(eventId),
      hostUrl: hostLinkUrl(token),
    }),
  );

  // Only the hash is stored, so the raw link is handed to the A5 page once,
  // in a short-lived cookie that only that page can read.
  const cookie = hostLinkCookie(eventId);
  (await cookies()).set(cookie.name, JSON.stringify({ token, emailed: sent.ok }), cookie.options);

  revalidatePublicSite();
  redirect(`/admin/events/${eventId}/approved`);
}

// A4 for Request changes (E2) and Decline (E3). The reason is required.
export async function reviewWithReason(
  eventId: string,
  to: "needs_changes" | "declined",
  _prev: ReasonFormState,
  formData: FormData,
): Promise<ReasonFormState> {
  await requireAdmin();
  const supabase = await createClient();
  const reason = String(formData.get("reason") ?? "").trim();
  const host = await hostContact(supabase, eventId);
  if (!host) return { error: "This request has no host details, so the host can't be emailed." };

  let result;
  try {
    result = await transitionEvent(supabase, { eventId, to, actor: "admin", reason });
  } catch (error) {
    if (error instanceof TransitionError) return { error: error.message };
    throw error;
  }

  const email =
    to === "needs_changes"
      ? needsChangesEmail({ hostName: host.host_name, event: result.event, reason, editUrl: hostLinkUrl(result.hostToken!) })
      : declinedEmail({ hostName: host.host_name, event: result.event, reason });
  const sent = await sendEmail(host.host_email, email);

  const done = to === "needs_changes" ? "Changes requested." : "Event declined.";
  if (sent.ok) {
    await setFlash(`${done} ${host.host_name} has been emailed.`);
  } else {
    await setFlash(
      `${done} But the email to ${host.host_name} couldn't be sent, so please contact them at ${host.host_email}.`,
      "error",
    );
  }
  revalidatePublicSite();
  redirect("/admin/events");
}

// A6 Take down (reason dialog, also offered on A7 for host edits). Emails the host (E11).
export async function takeDownEvent(eventId: string, _prev: ReasonFormState, formData: FormData): Promise<ReasonFormState> {
  await requireAdmin();
  const supabase = await createClient();
  const reason = String(formData.get("reason") ?? "").trim();

  let result;
  try {
    result = await transitionEvent(supabase, { eventId, to: "taken_down", actor: "admin", reason });
  } catch (error) {
    if (error instanceof TransitionError) return { error: error.message };
    throw error;
  }
  await closeEventAttention(supabase, eventId, "The event was taken down.");

  const host = await hostContact(supabase, eventId);
  const sent = host ? await sendEmail(host.host_email, takenDownEmail({ hostName: host.host_name, event: result.event, reason })) : null;
  if (host && sent?.ok) {
    await setFlash(`Event taken down. ${host.host_name} has been emailed.`);
  } else {
    await setFlash(
      `Event taken down. But the host couldn't be emailed${host ? `, so please contact them at ${host.host_email}` : ""}.`,
      "error",
    );
  }
  revalidatePublicSite();
  redirect(`/admin/events/${eventId}`);
}

// A6 Cancel event (confirmation dialog). Emails every registrant (E9).
export async function cancelEvent(eventId: string, _prev: ReasonFormState, formData: FormData): Promise<ReasonFormState> {
  await requireAdmin();
  const supabase = await createClient();

  let result;
  try {
    result = await transitionEvent(supabase, {
      eventId,
      to: "cancelled",
      actor: "admin",
      confirmed: formData.get("confirmed") === "yes",
    });
  } catch (error) {
    if (error instanceof TransitionError) return { error: error.message };
    throw error;
  }
  await closeEventAttention(supabase, eventId, "The event was cancelled.");

  const { data: registrants } = await supabase.from("registrations").select("name, email").eq("event_id", eventId);
  let failed = 0;
  for (const r of registrants ?? []) {
    const sent = await sendEmail(r.email, eventCancelledEmail({ registrantName: r.name, event: result.event }));
    if (!sent.ok) failed++;
  }

  const count = registrants?.length ?? 0;
  if (count === 0) {
    await setFlash("Event cancelled. Nobody had registered, so no emails were sent.");
  } else if (failed === 0) {
    await setFlash(`Event cancelled. ${count === 1 ? "The 1 registered person has" : `All ${count} registered people have`} been emailed.`);
  } else {
    await setFlash(`Event cancelled. ${failed} of ${count} emails to registered people couldn't be sent.`, "error");
  }
  revalidatePublicSite();
  redirect(`/admin/events/${eventId}`);
}

// A6 Regenerate host link (confirmation dialog). The old link stops working and
// the host gets E4 again with the new one.
export async function regenerateLink(eventId: string, _prev: ReasonFormState, _formData: FormData): Promise<ReasonFormState> {
  await requireAdmin();
  const supabase = await createClient();
  const host = await hostContact(supabase, eventId);
  if (!host) return { error: "This event has no host details, so the host can't be emailed." };

  let result;
  try {
    result = await regenerateHostLink(supabase, eventId);
  } catch (error) {
    if (error instanceof HostLinkError) return { error: error.message };
    throw error;
  }

  const sent = await sendEmail(
    host.host_email,
    approvedEmail({
      hostName: host.host_name,
      event: result.event,
      eventUrl: publicEventUrl(eventId),
      hostUrl: hostLinkUrl(result.token),
      resent: true,
    }),
  );
  const cookie = hostLinkCookie(eventId, "new-host-link");
  (await cookies()).set(cookie.name, JSON.stringify({ token: result.token, emailed: sent.ok }), cookie.options);
  revalidatePublicSite();
  redirect(`/admin/events/${eventId}/new-host-link`);
}
