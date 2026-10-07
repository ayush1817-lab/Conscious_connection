import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublishControls } from "@/components/content/publish-controls";
import { StoryEditor } from "@/components/content/story-editor";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/server";
import { deleteStory, saveStory, setStoryPublished } from "../../actions";

export const metadata: Metadata = { title: "Edit story · Website content · Conscious Connections" };

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: story } = await supabase
    .from("stories")
    .select("id, title, body, cover_path, published, published_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!story) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/content/stories" className="inline-flex min-h-tap items-center text-primary underline-offset-4 hover:underline">
        ‹ All stories
      </Link>
      <PublishControls
        kind="story"
        published={story.published}
        publishedAt={story.published_at}
        toggle={setStoryPublished.bind(null, story.id, !story.published)}
      >
        <ConfirmDialog
          trigger="Delete"
          title="Delete this story?"
          confirmLabel="Yes, delete it"
          action={deleteStory.bind(null, story.id)}
          variant="danger"
          confirmVariant="destructive"
        >
          <p>&ldquo;{story.title}&rdquo; will be removed from the website and from here. This can&apos;t be undone.</p>
        </ConfirmDialog>
      </PublishControls>
      <StoryEditor key={story.updated_at ?? "new"} story={story} action={saveStory.bind(null, story.id)} saveLabel="Save" />
    </div>
  );
}
