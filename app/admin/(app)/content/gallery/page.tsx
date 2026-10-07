import type { Metadata } from "next";
import { CaptionForm } from "@/components/content/caption-form";
import { GalleryUploader } from "@/components/content/gallery-uploader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { addGalleryImages, deleteGalleryImage, moveGalleryImage, saveCaption } from "../actions";

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

  return (
    <div className="space-y-4">
      <GalleryUploader addImages={addGalleryImages} />
      {images?.length ? (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3">
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
                  <button type="submit" disabled={i === 0} className={moveButton} aria-label={`Move image ${i + 1} earlier`}>
                    ↑ Earlier
                  </button>
                </form>
                <form action={moveGalleryImage.bind(null, img.id, "down")}>
                  <button type="submit" disabled={i === images.length - 1} className={moveButton} aria-label={`Move image ${i + 1} later`}>
                    ↓ Later
                  </button>
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
