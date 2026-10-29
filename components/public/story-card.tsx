import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { excerpt } from "@/lib/public/content";
import { publicImageUrl } from "@/lib/storage";
import { Doodle, type DoodleName } from "./doodles";
import { ArrowRightIcon } from "./icons";

type Story = { title: string; slug: string; cover_path: string | null; body: string; published_at?: string | null };

// Cards without a cover photo get a tinted panel with a big quote mark instead
// of an empty box; `tone` cycles the tint so a list doesn't look repetitive.
const TONES = ["tone-lilac", "tone-band", "tone-orchid"] as const;
const MARKS: DoodleName[] = ["sparkle", "heart", "flower"];

// `level` is the heading level for the title: 3 under a section heading, 2 on a list page.
// `featured` is the big first card: a wider cover and a longer excerpt.
export function StoryCard({
  story,
  level = 3,
  tone = 0,
  featured = false,
}: {
  story: Story;
  level?: 2 | 3;
  tone?: number;
  featured?: boolean;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  const t = tone % TONES.length;
  // A featured story without a photo shows its opening lines as a pull quote.
  const pullQuote = featured && !story.cover_path;
  return (
    <article className={`story-card group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface ${featured ? "story-card-featured" : ""}`}>
      <div className={`story-card-cover relative ${story.cover_path ? "bg-band" : TONES[t]} ${pullQuote ? "story-card-quote" : ""}`}>
        {story.cover_path ? (
          <Image
            src={publicImageUrl("content", story.cover_path)}
            alt=""
            fill
            sizes={featured ? "(min-width: 1024px) 640px, 100vw" : "(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"}
            className="object-cover"
          />
        ) : (
          <div aria-hidden className="story-placeholder">
            <span className="story-quote">&ldquo;</span>
            <Doodle name={MARKS[t]} tone="primary" className="story-placeholder-mark" />
            <Doodle name="squiggle" tone="primary" className="story-placeholder-line" />
          </div>
        )}
        {pullQuote ? <p className="story-pull-quote">{excerpt(story.body, 170)}</p> : null}
      </div>
      <div className="story-card-body flex flex-1 flex-col gap-2 p-4">
        {story.published_at ? <p className="story-card-date text-sm text-muted">{formatDate(story.published_at)}</p> : null}
        <Heading className="font-heading text-lg leading-snug font-semibold">
          <Link href={`/stories/${story.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {story.title}
          </Link>
        </Heading>
        {pullQuote ? null : <p className="story-card-excerpt text-muted">{excerpt(story.body, featured ? 220 : 110)}</p>}
        <span aria-hidden className="mt-auto inline-flex items-center gap-1 pt-1 font-medium text-primary">
          Read story <ArrowRightIcon size={18} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card group-has-[a:focus-visible]:outline-3 group-has-[a:focus-visible]:outline-primary" />
    </article>
  );
}

// One line in a short list of stories: a small tinted tile, title and date.
export function StoryRow({ story, tone = 0, level = 3 }: { story: Story; tone?: number; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  const t = tone % TONES.length;
  return (
    <article className="story-row group relative flex items-center gap-4 rounded-card border border-border bg-surface p-3">
      <div className={`story-row-thumb relative shrink-0 overflow-hidden ${story.cover_path ? "bg-band" : TONES[t]}`}>
        {story.cover_path ? (
          <Image src={publicImageUrl("content", story.cover_path)} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <Doodle name={MARKS[t]} tone="primary" className="story-row-mark" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Heading className="font-heading leading-snug font-semibold">
          <Link href={`/stories/${story.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {story.title}
          </Link>
        </Heading>
        <p className="story-row-excerpt mt-1 text-sm text-muted">{excerpt(story.body, 80)}</p>
      </div>
      <ArrowRightIcon size={20} className="shrink-0 text-primary transition-transform group-hover:translate-x-1" />
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card group-has-[a:focus-visible]:outline-3 group-has-[a:focus-visible]:outline-primary" />
    </article>
  );
}
