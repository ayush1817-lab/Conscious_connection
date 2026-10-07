"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { approvedEmail, declinedEmail, needsChangesEmail, sendEmail } from "@/lib/email";
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
    revalidatePath("/admin", "layout");
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

  revalidatePath("/admin", "layout");
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
  revalidatePath("/admin", "layout");
  redirect("/admin/events");
}
