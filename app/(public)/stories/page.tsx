import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/public/section-heading";
import { StoryCard } from "@/components/public/story-card";
import { buttonClass } from "@/components/ui/button";
import { getPageIntro, getStories } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "Stories and poetry",
  description: "Stories and poetry from the Conscious Connections community across the island of Ireland.",
};

export default async function StoriesPage() {
  const [stories, intro] = await Promise.all([getStories(), getPageIntro("stories")]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageIntro title={intro.heading} intro={intro.body} />
      <div className="-mt-2 mb-8 flex flex-col gap-3 rounded-card bg-band p-5 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Have a story or poem you&apos;d like to share? We&apos;d love to read it. Please read our{" "}
          <Link href="/guidelines#stories" className="font-medium text-primary underline underline-offset-4">
            story guidelines
          </Link>{" "}
          first.
        </p>
        <Link href="/stories/share" className={buttonClass("primary", "shrink-0")}>
          Share your story
        </Link>
      </div>
      {stories.length ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <li key={story.id}>
              <StoryCard story={story} level={2} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-border bg-surface p-6 text-muted">No stories yet. Check back soon.</p>
      )}
    </div>
  );
}
