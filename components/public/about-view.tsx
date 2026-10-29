import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { RichText } from "@/lib/content/rich-text";
import { PhotoGrid } from "@/components/public/photo-grid";
import { Doodle } from "@/components/public/doodles";
import { PhotoPlaceholder } from "@/components/public/image-slot";
import { Eyebrow } from "@/components/public/section-heading";
import { Illustration } from "@/components/public/illustrations";
import { photosOf, type SectionValues as Section } from "@/lib/content/sections";
import { publicImageUrl } from "@/lib/storage";

// The About page (Website content > About). Shared by the public page and the
// admin preview; data-area marks which part of the editor each piece belongs to.

// Splits the About text into parts, one per "## " sub-heading. Any text
// before the first sub-heading becomes its own part.
function splitParts(body: string) {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n(?=## )/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function AboutView({ sections }: { sections: Record<string, Section> }) {
  const { about } = sections;
  const photos = photosOf(sections);
  const parts = about?.body ? splitParts(about.body) : [];
  // Only parts that start with a sub-heading get a photo beside them, in order.
  // Photos left over (more photos than parts) are shown in a row underneath.
  const paired: (Section | undefined)[] = [];
  let next = 0;
  for (const part of parts) paired.push(part.startsWith("## ") ? photos[next++] : undefined);
  // Sub-headed parts beyond the uploaded photos get a labelled placeholder (up to the 3 slots).
  const slotOf = (i: number) => parts.slice(0, i + 1).filter((p) => p.startsWith("## ")).length;
  const leftover = photos.slice(next);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="page-intro page-intro-illustrated" data-area="about">
        <div className="page-intro-copy">
          <Eyebrow>{sections.about_eyebrow.heading}</Eyebrow>
          <h1 className="font-heading text-3xl font-semibold md:text-4xl">{about?.heading || "About Conscious Connections"}</h1>
        </div>
        <div className="page-intro-art">
          <Illustration name="hearts" />
          <Doodle name="sparkle" tone="orchid" className="page-intro-spark" />
        </div>
      </div>
      {about?.image_path ? (
        <div data-area="about" className="about-banner relative mt-6 aspect-[16/9] overflow-hidden bg-band md:aspect-[21/8]">
          <Image src={publicImageUrl("content", about.image_path)} alt={about.image_alt} fill preload sizes="(min-width: 1152px) 1120px, 100vw" className="object-cover" />
        </div>
      ) : null}

      {parts.length ? (
        <div data-area="about" className="about-rows mt-8 space-y-10 md:space-y-14">
          {parts.map((part, i) => {
            const photo = paired[i];
            const slot = slotOf(i);
            const wantsPhoto = part.startsWith("## ") && slot <= 3;
            if (!photo && !wantsPhoto) return <RichText key={i} text={part} className="max-w-4xl text-lg" blocks />;
            // Photos alternate sides on wider screens: right, left, right...
            const photoLeft = slot % 2 === 0;
            return (
              <section key={i} className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
                <figure data-area="photos" className={`about-photo-frame ${photoLeft ? "" : "md:order-last"}`}>
                  <Doodle name={(["sparkle", "heart", "flower"] as const)[(slot - 1) % 3]} tone="primary" />
                  {photo ? (
                    <div className="about-photo relative aspect-[4/3] overflow-hidden bg-band">
                      <Image src={publicImageUrl("content", photo.image_path!)} alt={photo.image_alt} fill loading="lazy" sizes="(min-width: 1152px) 540px, (min-width: 768px) 50vw, 100vw" className="object-cover" />
                    </div>
                  ) : (
                    <PhotoPlaceholder
                      label={`About photo ${slot}`}
                      suggestion={["Your community together: a warm group photo", "People chatting at a local event", "A moment of welcome: hugs, smiles, a shared table"][slot - 1]}
                      size="1200 × 900 px, landscape"
                      where={`Add it in Admin › Website content › About › Event photo ${slot}`}
                      className="about-photo aspect-[4/3]"
                    />
                  )}
                  {photo?.heading ? <figcaption className="mt-2 text-sm text-muted">{photo.heading}</figcaption> : null}
                </figure>
                <RichText text={part} className="min-w-0 text-lg" blocks />
              </section>
            );
          })}
        </div>
      ) : null}

      {leftover.length ? (
        <section data-area="photos" aria-label="Photos from our events" className="mt-10">
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
