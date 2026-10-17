import Image from "next/image";
import type { Section } from "@/lib/public/content";
import { publicImageUrl } from "@/lib/storage";

// Event photos from Website content. next/image serves each at the size the
// layout needs (srcset) and loads them lazily as they scroll into view.
export function PhotoGrid({ photos }: { photos: Section[] }) {
  if (!photos.length) return null;
  const cols = photos.length === 1 ? "" : photos.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  const sizes = photos.length === 1 ? "(min-width: 1152px) 1120px, 100vw" : photos.length === 2 ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 1152px) 370px, (min-width: 640px) 33vw, 100vw";
  return (
    <ul className={`grid gap-4 ${cols}`}>
      {photos.map((p) => (
        <li key={p.key}>
          <figure>
            <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-band">
              <Image src={publicImageUrl("content", p.image_path!)} alt={p.image_alt} fill loading="lazy" sizes={sizes} className="object-cover" />
            </div>
            {p.heading ? <figcaption className="mt-2 text-sm text-muted">{p.heading}</figcaption> : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}
