import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@/components/public/icons";
import { RichText } from "@/lib/content/rich-text";
import { formatDate } from "@/lib/format";
import { excerpt, getStory } from "@/lib/public/content";
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

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/stories" className="mb-6 inline-flex min-h-tap items-center gap-2 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeftIcon size={18} /> All stories
      </Link>
      <h1 className="font-heading text-3xl leading-tight font-semibold md:text-4xl">{story.title}</h1>
      {story.published_at ? <p className="mt-2 text-muted">{formatDate(story.published_at)}</p> : null}
      {story.cover_path ? (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-card bg-band">
          <Image src={publicImageUrl("content", story.cover_path)} alt="" fill preload sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />
        </div>
      ) : null}
      <RichText text={story.body} className="mt-6 text-lg" />
    </article>
  );
}
