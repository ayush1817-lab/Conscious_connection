import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { RichText } from "@/lib/content/rich-text";
import { PhotoGrid } from "@/components/public/photo-grid";
import { getSections, photosOf, type Section } from "@/lib/public/content";
import { publicImageUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "About",
  description: "Conscious Connections is a community for LGBTQ+ women and non-binary people across the island of Ireland.",
};

// Splits the About text into parts, one per "## " sub-heading. Any text
// before the first sub-heading becomes its own part.
function splitParts(body: string) {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n(?=## )/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function AboutPage() {
  const sections = await getSections("about");
  const { about } = sections;
  const photos = photosOf(sections);
  const parts = about?.body ? splitParts(about.body) : [];
  // Only parts that start with a sub-heading get a photo beside them, in order.
  // Photos left over (more photos than parts) are shown in a row underneath.
  const paired: (Section | undefined)[] = [];
  let next = 0;
  for (const part of parts) paired.push(part.startsWith("## ") ? photos[next++] : undefined);
  const leftover = photos.slice(next);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold md:text-4xl">{about?.heading || "About Conscious Connections"}</h1>
      {about?.image_path ? (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-card bg-band md:aspect-[21/8]">
          <Image src={publicImageUrl("content", about.image_path)} alt={about.image_alt} fill preload sizes="(min-width: 1152px) 1120px, 100vw" className="object-cover" />
        </div>
      ) : null}

      {parts.length ? (
        <div className="about-rows mt-8 space-y-10 md:space-y-14">
          {parts.map((part, i) => {
            const photo = paired[i];
            if (!photo) return <RichText key={i} text={part} className="max-w-4xl text-lg" blocks />;
            // Photos alternate sides on wider screens: right, left, right...
            const photoLeft = paired.slice(0, i + 1).filter(Boolean).length % 2 === 0;
            return (
              <section key={i} className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
                <figure className={photoLeft ? "" : "md:order-last"}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-band">
                    <Image src={publicImageUrl("content", photo.image_path!)} alt={photo.image_alt} fill loading="lazy" sizes="(min-width: 1152px) 540px, (min-width: 768px) 50vw, 100vw" className="object-cover" />
                  </div>
                  {photo.heading ? <figcaption className="mt-2 text-sm text-muted">{photo.heading}</figcaption> : null}
                </figure>
                <RichText text={part} className="min-w-0 text-lg" blocks />
              </section>
            );
          })}
        </div>
      ) : null}

      {leftover.length ? (
        <section aria-label="Photos from our events" className="mt-10">
          <PhotoGrid photos={leftover} />
        </section>
      ) : null}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/events" className={buttonClass("primary")}>
          Find events
        </Link>
        <Link href="/submit-event" className={buttonClass("secondary")}>
          Host an event
        </Link>
      </div>
    </div>
  );
}
