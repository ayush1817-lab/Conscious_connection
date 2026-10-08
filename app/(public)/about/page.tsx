import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { RichText } from "@/lib/content/rich-text";
import { getSections } from "@/lib/public/content";
import { publicImageUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "About",
  description: "Why Conscious Connections exists and who it's for.",
};

export default async function AboutPage() {
  const { about } = await getSections("about");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold md:text-4xl">{about?.heading || "About Conscious Connections"}</h1>
      {about?.image_path ? (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-card bg-band">
          <Image src={publicImageUrl("content", about.image_path)} alt="" fill preload sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />
        </div>
      ) : null}
      {about?.body ? <RichText text={about.body} className="mt-6 text-lg" /> : null}
      <div className="mt-8 flex flex-wrap gap-3">
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
