"use server";

import { notifyAdmins } from "@/lib/email/admin-recipients";
import { newGalleryPhotosEmail, sendQuietly } from "@/lib/email";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/content/images";
import { loadHostEvent } from "@/lib/host/host-event";
import { CAPTION_MAX, MAX_PHOTOS_PER_EVENT, MAX_PHOTOS_PER_SEND, PHOTO_BUCKET, isHostPhotoPath } from "@/lib/host/photos";
import { adminGalleryUrl } from "@/lib/links";
import { RATE_LIMITED_MESSAGE, withinRateLimit } from "@/lib/public/spam";
import { revalidatePublicSite } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";

const GONE = "This link is no longer active. Please reload the page.";
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type PhotoState = { error?: string; consentError?: string; sent?: number };

// Live or just-ended events only (not pending or needs-changes ones).
async function photoHost(token: string) {
  const host = await loadHostEvent(token);
  return host && (host.view === "live" || host.view === "ended") ? host : null;
}

async function photosUsed(eventId: string) {
  const { count } = await createAdminClient()
    .from("gallery_submissions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["pending", "approved"]);
  return count ?? 0;
}

// A signed upload URL into the private bucket, for one photo.
export async function createHostPhotoUpload(token: string, type: string, size: number): Promise<{ path: string; token: string } | { error: string }> {
  const host = await photoHost(token);
  if (!host) return { error: GONE };
  if (!(IMAGE_TYPES as readonly string[]).includes(type)) return { error: "Photos must be a JPG, PNG or WebP." };
  if (!(size > 0) || size > IMAGE_MAX_BYTES) return { error: `Photos can be up to 5MB (this one is ${(size / 1024 / 1024).toFixed(1)}MB).` };
  if ((await photosUsed(host.event.id)) >= MAX_PHOTOS_PER_EVENT) return { error: `You can send up to ${MAX_PHOTOS_PER_EVENT} photos for one event.` };
  if (!(await withinRateLimit("hostPhotoUpload"))) return { error: RATE_LIMITED_MESSAGE };
  const path = `${host.event.id}/${crypto.randomUUID()}.${EXTENSIONS[type]}`;
  const { data, error } = await createAdminClient().storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl (host photo) failed", error);
    return { error: "The photo couldn't be uploaded. Please try again." };
  }
  return { path, token: data.token };
}

// Saves the uploaded photos as waiting for review and tells the team.
export async function sendHostPhotos(token: string, _prev: PhotoState, formData: FormData): Promise<PhotoState> {
  const host = await photoHost(token);
  if (!host) return { error: GONE };
  const eventId = host.event.id;

  let photos: { path: string; caption: string }[] = [];
  try {
    const parsed: unknown = JSON.parse(String(formData.get("photos") ?? "[]"));
    if (Array.isArray(parsed))
      photos = parsed
        .filter((p): p is { path: string; caption?: unknown } => typeof p?.path === "string")
        .map((p) => ({ path: p.path, caption: typeof p.caption === "string" ? p.caption.replace(/\s+/g, " ").trim() : "" }));
  } catch {
    photos = [];
  }
  photos = photos.filter((p) => isHostPhotoPath(p.path, eventId));
  if (!photos.length) return { error: "Please add at least one photo." };
  if (photos.length > MAX_PHOTOS_PER_SEND) return { error: `You can send up to ${MAX_PHOTOS_PER_SEND} photos at a time.` };
  if (photos.some((p) => p.caption.length > CAPTION_MAX)) return { error: `Descriptions can be up to ${CAPTION_MAX} characters.` };
  if (formData.get("consent") !== "yes") return { consentError: "Please tick the box to confirm everyone in the photos is happy for them to be shared." };
  if ((await photosUsed(eventId)) + photos.length > MAX_PHOTOS_PER_EVENT) return { error: `You can send up to ${MAX_PHOTOS_PER_EVENT} photos for one event.` };
  if (!(await withinRateLimit("hostPhotos"))) return { error: RATE_LIMITED_MESSAGE };

  const db = createAdminClient();
  const checks = await Promise.all(photos.map((p) => db.storage.from(PHOTO_BUCKET).exists(p.path)));
  if (checks.some((c) => !c.data)) return { error: "Some photos didn't finish uploading. Please remove them and add them again." };

  const { error } = await db.from("gallery_submissions").insert(
    photos.map((p) => ({ event_id: eventId, event_title: host.event.title, image_path: p.path, caption: p.caption || null })),
  );
  if (error) {
    console.error("gallery submission failed", error);
    return { error: "Something went wrong and your photos weren't sent. Please try again." };
  }

  await sendQuietly("gallery photos submitted", () =>
    notifyAdmins(newGalleryPhotosEmail({ eventTitle: host.event.title, count: photos.length, adminUrl: adminGalleryUrl() })),
  );
  revalidatePublicSite(); // the admin's review list
  return { sent: photos.length };
}
