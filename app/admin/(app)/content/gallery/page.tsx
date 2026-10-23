import type { Metadata } from "next";
import { CaptionForm } from "@/components/content/caption-form";
import { GalleryUploader } from "@/components/content/gallery-uploader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { PhotoReviewForm } from "@/components/content/photo-review-form";
import { formatDateTime } from "@/lib/format";
import { PHOTO_BUCKET } from "@/lib/host/photos";
import { addGalleryImages, approveGalleryPhoto, declineGalleryPhoto, deleteGalleryImage, moveGalleryImage, saveCaption } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "Gallery · Website content · Conscious Connections" };

const moveButton =
  "min-h-tap w-full rounded-control border border-control-border bg-surface px-3 font-medium hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data: images } = await supabase
    .from("gallery_images")
    .select("id, image_path, caption, sort_order, updated_at")
    .order("sort_order")
    .order("created_at");
  const { data: waiting } = await supabase
    .from("gallery_submissions")
    .select("id, event_title, caption, image_path, created_at")
    .eq("status", "pending")
    .order("created_at");
  const paths = (waiting ?? []).map((w) => w.image_path).filter((p): p is string => Boolean(p));
  const signed = paths.length ? ((await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600)).data ?? []) : [];
  const urls = new Map(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));

  return (
    <div className="space-y-4">
      {waiting?.length ? (
        <section aria-labelledby="review-heading" className="space-y-3 rounded-card border-2 border-warning bg-surface p-4">
          <h2 id="review-heading" className="text-lg font-semibold">
            Photos to review ({waiting.length})
          </h2>
          <p className="text-muted">Sent by hosts from their event page. They aren&apos;t on the website until you approve them.</p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {waiting.map((w, i) => (
              <li key={w.id} className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-background p-3">
                {w.image_path && urls.get(w.image_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls.get(w.image_path)} alt={w.caption ?? `Photo ${i + 1} to review`} className="aspect-[4/3] w-full rounded-control object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center rounded-control bg-band text-muted">Photo missing</div>
                )}
                <p className="text-sm">
                  <span className="font-medium">From: {w.event_title}</span>
                  <br />
                  <span className="text-muted">Sent {formatDateTime(w.created_at)}</span>
                </p>
                <PhotoReviewForm caption={w.caption ?? ""} action={approveGalleryPhoto.bind(null, w.id)} />
                <ConfirmDialog
                  trigger="Decline"
                  title="Decline this photo?"
                  confirmLabel="Yes, decline it"
                  action={declineGalleryPhoto.bind(null, w.id)}
                  variant="danger"
                  confirmVariant="destructive"
                >
                  <p>The photo will be deleted and won&apos;t appear on the website. The host will see it wasn&apos;t used.</p>
                </ConfirmDialog>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <GalleryUploader addImages={addGalleryImages} />
      {images?.length ? (
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicImageUrl("gallery", img.image_path)}
                alt={img.caption ?? `Gallery image ${i + 1}`}
                className="aspect-[4/3] w-full rounded-control object-cover"
              />
              <p className="text-sm text-muted">
                Position {i + 1} of {images.length}
              </p>
              <CaptionForm
                key={`${img.id}-${img.updated_at}`}
                id={img.id}
                caption={img.caption ?? ""}
                action={saveCaption.bind(null, img.id)}
              />
              <div className="grid grid-cols-2 gap-2">
                <form action={moveGalleryImage.bind(null, img.id, "up")}>
                  <SubmitButton pendingLabel="Moving…" disabled={i === 0} className={moveButton} aria-label={`Move image ${i + 1} earlier`}>
                    ↑ Earlier
                  </SubmitButton>
                </form>
                <form action={moveGalleryImage.bind(null, img.id, "down")}>
                  <SubmitButton pendingLabel="Moving…" disabled={i === images.length - 1} className={moveButton} aria-label={`Move image ${i + 1} later`}>
                    ↓ Later
                  </SubmitButton>
                </form>
              </div>
              <ConfirmDialog
                trigger="Delete"
                title="Delete this image?"
                confirmLabel="Yes, delete it"
                action={deleteGalleryImage.bind(null, img.id)}
                variant="danger"
                confirmVariant="destructive"
              >
                <p>It will be removed from the website gallery. This can&apos;t be undone.</p>
              </ConfirmDialog>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState>The gallery is empty. Upload some images to get started.</EmptyState>
      )}
    </div>
  );
}
