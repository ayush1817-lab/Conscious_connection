import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Doodle } from "@/components/public/doodles";
import { ArrowLeftIcon } from "@/components/public/icons";
import { Eyebrow } from "@/components/public/section-heading";
import { StoryRow } from "@/components/public/story-card";
import { RichText } from "@/lib/content/rich-text";
import { formatDate } from "@/lib/format";
import { excerpt, getStories, getStory } from "@/lib/public/content";
import { publicImageUrl } from "@/lib/storage";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await getStory((await params).slug);
  if (!story) return { title: "Story not found" };
  const description = excerpt(story.body);
  const images = story.cover_path ? [publicImageUrl("content", story.cover_path)] : undefined;
  return {
    title: story.title,
    description,
    openGraph: { title: story.title, description, type: "article", images },
    twitter: { title: story.title, description, images },
  };
}

export default async function StoryPage({ params }: Props) {
  const story = await getStory((await params).slug);
  if (!story) notFound();
  // A short "more stories" list at the end, without this one.
  const more = (await getStories(4)).filter((s) => s.slug !== story.slug).slice(0, 3);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/stories" className="mb-6 inline-flex min-h-tap items-center gap-2 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeftIcon size={18} /> All stories
      </Link>
      <header className="story-header">
        <Doodle name="sparkle" tone="primary" className="doodle-a" />
        <Doodle name="loop" tone="orchid" className="doodle-b" />
        <Eyebrow>Stories &amp; poetry</Eyebrow>
        <h1 className="max-w-[24ch] font-heading text-3xl leading-tight font-semibold md:text-4xl">{story.title}</h1>
        {story.author_name || story.published_at ? (
          <p className="mt-2 text-muted">{[story.author_name ? `By ${story.author_name}` : null, story.published_at ? formatDate(story.published_at) : null].filter(Boolean).join(" · ")}</p>
        ) : null}
      </header>
      {story.cover_path ? (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-card bg-band">
          <Image src={publicImageUrl("content", story.cover_path)} alt="" fill preload sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />
        </div>
      ) : null}
      <RichText text={story.body} className="story-body mt-8 text-lg" />
      <div className="story-end">
        <Doodle name="squiggle" tone="orchid" />
      </div>
      {more.length ? (
        <section aria-labelledby="more-heading" className="mt-6">
          <h2 id="more-heading" className="mb-4 font-heading text-2xl font-semibold">More stories and poems</h2>
          <ul className="flex flex-col gap-3">
            {more.map((s, i) => (
              <li key={s.id}>
                <StoryRow story={s} tone={i} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-8 rounded-card bg-band p-5">
        Have a story of your own?{" "}
        <Link href="/stories/share" className="font-medium text-primary underline underline-offset-4">
          Share your story
        </Link>
      </p>
    </article>
  );
}
