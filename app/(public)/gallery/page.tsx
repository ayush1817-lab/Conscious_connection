import type { Metadata } from "next";
import { GalleryLightbox } from "@/components/public/gallery-lightbox";
import { PageIntro } from "@/components/public/section-heading";
import { getPageIntro, getGallery } from "@/lib/public/content";
import { publicImageUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Moments from Conscious Connections events and community.",
};

export default async function GalleryPage() {
  const [images, intro] = await Promise.all([getGallery(), getPageIntro("gallery")]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageIntro title={intro.heading} intro={intro.body} />
      {images.length ? (
        <GalleryLightbox
          photos={images.map((img) => ({ id: img.id, src: publicImageUrl("gallery", img.image_path), caption: img.caption }))}
        />
      ) : (
        <p className="rounded-card border border-border bg-surface p-6 text-muted">No photos yet. Check back soon.</p>
      )}
    </div>
  );
}
