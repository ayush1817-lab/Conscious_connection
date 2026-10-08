"use server";

import { redirect } from "next/navigation";
import { notifyAdmins } from "@/lib/email/admin-recipients";
import { newSubmissionEmail, sendEmail, submittedEmail } from "@/lib/email";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/content/images";
import { adminEventUrl } from "@/lib/links";
import { POSTER_FOLDER, readEventForm, validateEventForm, type EventFormValues } from "@/lib/public/event-form";
import { isLikelyBot, RATE_LIMITED_MESSAGE, withinRateLimit } from "@/lib/public/spam";
import type { FieldErrors } from "@/lib/public/validate";
import { revalidatePublicSite } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmitState = { error?: string; fieldErrors?: FieldErrors; values?: EventFormValues; consent?: boolean };

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Step 1 of a poster upload: the server checks the file type and size and hands
// out a one-time signed upload URL for a random file name. The browser then
// uploads straight to Storage, so large images never pass through the server.
// The posters bucket also enforces JPG/PNG/WebP and 5MB itself.
export async function createPosterUpload(type: string, size: number): Promise<{ path: string; token: string } | { error: string }> {
  if (!(IMAGE_TYPES as readonly string[]).includes(type)) return { error: "Posters must be a JPG, PNG or WebP image." };
  if (!(size > 0) || size > IMAGE_MAX_BYTES) return { error: `Posters can be up to 5MB (this one is ${(size / 1024 / 1024).toFixed(1)}MB).` };
  if (!(await withinRateLimit("posterUpload"))) return { error: RATE_LIMITED_MESSAGE };

  const path = `${POSTER_FOLDER}/${crypto.randomUUID()}.${EXTENSIONS[type]}`;
  const { data, error } = await createAdminClient().storage.from("posters").createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl failed", error);
    return { error: "The poster couldn't be uploaded. Please try again." };
  }
  return { path, token: data.token };
}

// H1: submit an event for review.
export async function submitEvent(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const values = readEventForm(formData);
  const consent = formData.get("consent") === "yes";

  if (isLikelyBot(formData)) redirect("/submit-event/thanks");

  const { errors, event, details } = validateEventForm(values);
  if (!consent) errors.consent = "Please tick the box to agree, so Karina can review your event.";
  if (Object.keys(errors).length || !event || !details) return { fieldErrors: errors, values, consent };

  if (!(await withinRateLimit("submit"))) return { error: RATE_LIMITED_MESSAGE, values, consent };

  const db = createAdminClient();
  if (event.poster_path) {
    const { data: exists } = await db.storage.from("posters").exists(event.poster_path);
    if (!exists) {
      return { fieldErrors: { poster_path: "That poster didn't finish uploading. Please add it again." }, values: { ...values, poster_path: "" }, consent };
    }
  }

  const { data: eventId, error } = await db.rpc("submit_event", {
    p_title: event.title,
    p_county: event.county,
    p_start_at: event.start_at,
    p_end_at: event.end_at,
    p_description: event.description,
    p_poster_path: event.poster_path,
    p_capacity: event.capacity,
    p_exact_address: details.exact_address,
    p_host_name: details.host_name,
    p_host_email: details.host_email,
    p_host_phone: details.host_phone,
    p_about_group: details.about_group,
    p_emergency_contact_name: details.emergency_contact_name,
    p_emergency_contact_phone: details.emergency_contact_phone,
  });
  if (error || !eventId) {
    console.error("submit_event failed", error);
    return { error: "Something went wrong and your event wasn't sent. Please try again.", values, consent };
  }

  await Promise.all([
    sendEmail(details.host_email, submittedEmail({ hostName: details.host_name, event })),
    notifyAdmins(newSubmissionEmail({ event, hostName: details.host_name, about: details.about_group, adminUrl: adminEventUrl(eventId) })),
  ]);
  revalidatePublicSite(); // the admin's New requests list and counts
  redirect("/submit-event/thanks");
}
