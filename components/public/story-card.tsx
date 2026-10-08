import Image from "next/image";
import Link from "next/link";
import { excerpt } from "@/lib/public/content";
import { publicImageUrl } from "@/lib/storage";
import { ArrowRightIcon } from "./icons";

type Story = { title: string; slug: string; cover_path: string | null; body: string };

// `level` is the heading level for the title: 3 under a section heading, 2 on a list page.
export function StoryCard({ story, level = 3 }: { story: Story; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm hover:shadow-md">
      <div className="relative aspect-[3/2] bg-band">
        {story.cover_path ? (
          <Image src={publicImageUrl("content", story.cover_path)} alt="" fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div aria-hidden className="h-full w-full bg-gradient-to-br from-hero to-band" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Heading className="font-heading text-lg leading-snug font-semibold">
          <Link href={`/stories/${story.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {story.title}
          </Link>
        </Heading>
        <p className="text-muted">{excerpt(story.body, 120)}</p>
        <span aria-hidden className="mt-auto inline-flex items-center gap-1 pt-1 font-medium text-primary">
          Read story <ArrowRightIcon size={18} />
        </span>
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card group-has-[a:focus-visible]:outline-3 group-has-[a:focus-visible]:outline-primary" />
    </article>
  );
}
