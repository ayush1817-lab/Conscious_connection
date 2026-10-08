import type { Metadata } from "next";
import { PageIntro } from "@/components/public/section-heading";
import { StoryCard } from "@/components/public/story-card";
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
