import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/public/section-heading";
import { StoryCard } from "@/components/public/story-card";
import { buttonClass } from "@/components/ui/button";
import { getStories } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "Stories",
  description: "Real experiences from the Conscious Connections community in rural Ireland.",
};

export default async function StoriesPage() {
  const stories = await getStories();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageIntro title="Stories">Real experiences from our community.</PageIntro>
      <div className="-mt-2 mb-8 flex flex-col gap-3 rounded-card bg-band p-5 sm:flex-row sm:items-center sm:justify-between">
        <p>Have something you&apos;d like to share? We&apos;d love to hear it.</p>
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
