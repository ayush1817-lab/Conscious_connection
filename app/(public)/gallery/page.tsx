import type { Metadata } from "next";
import Image from "next/image";
import { PageIntro } from "@/components/public/section-heading";
import { getGallery } from "@/lib/public/content";
import { publicImageUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Moments from Conscious Connections events and community.",
};

export default async function GalleryPage() {
  const images = await getGallery();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageIntro title="Gallery">Moments from our events and community.</PageIntro>
      {images.length ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <li key={img.id}>
              <figure>
                <div className="relative aspect-square overflow-hidden rounded-card bg-band">
                  <Image
                    src={publicImageUrl("gallery", img.image_path)}
                    // The caption below describes the photo, so the image itself needs no alt text.
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
                    className="object-cover"
                  />
                </div>
                {img.caption ? <figcaption className="mt-1 text-sm text-muted">{img.caption}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-border bg-surface p-6 text-muted">No photos yet. Check back soon.</p>
      )}
    </div>
  );
}
