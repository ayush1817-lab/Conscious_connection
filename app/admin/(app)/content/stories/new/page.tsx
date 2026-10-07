import type { Metadata } from "next";
import Link from "next/link";
import { StoryEditor } from "@/components/content/story-editor";
import { createStory } from "../../actions";

export const metadata: Metadata = { title: "New story · Website content · Conscious Connections" };

export default function NewStoryPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/content/stories" className="inline-flex min-h-tap items-center text-primary underline-offset-4 hover:underline">
        ‹ All stories
      </Link>
      <h2 className="text-xl font-semibold">New story</h2>
      <p className="text-muted">It&apos;s saved as a draft first. Nothing appears on the website until you publish it.</p>
      <StoryEditor action={createStory} saveLabel="Save draft" />
    </div>
  );
}
