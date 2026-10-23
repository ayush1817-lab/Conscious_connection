import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicImageUrl } from "@/lib/storage";
import { PHOTO_BUCKET } from "./photos";

export type HostPhoto = { id: string; status: "pending" | "approved" | "declined"; caption: string | null; url: string | null };

// The photos a host has sent for their event, newest first. Waiting photos are
// shown through short-lived signed links (the bucket is private).
export async function loadHostPhotos(eventId: string): Promise<HostPhoto[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("gallery_submissions")
    .select("id, status, caption, image_path, gallery_images(image_path)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === "pending" && r.image_path).map((r) => r.image_path!);
  const signed = pending.length ? (await db.storage.from(PHOTO_BUCKET).createSignedUrls(pending, 3600)).data ?? [] : [];
  const urls = new Map(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    caption: r.caption,
    url:
      r.status === "approved" && r.gallery_images
        ? publicImageUrl("gallery", r.gallery_images.image_path)
        : r.image_path
          ? (urls.get(r.image_path) ?? null)
          : null,
  }));
}
