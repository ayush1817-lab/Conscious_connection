import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PodcastEditor } from "@/components/content/podcast-editor";
import { PublishControls } from "@/components/content/publish-controls";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/server";
import { deletePodcast, savePodcast, setPodcastPublished } from "../../actions";

export const metadata: Metadata = { title: "Edit podcast · Website content · Conscious Connections" };

export default async function EditPodcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: podcast } = await supabase
    .from("podcasts")
    .select("id, title, description, youtube_url, published, published_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!podcast) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/content/podcasts" className="inline-flex min-h-tap items-center text-primary underline-offset-4 hover:underline">
        ‹ All podcasts
      </Link>
      <PublishControls
        kind="podcast"
        published={podcast.published}
        publishedAt={podcast.published_at}
        toggle={setPodcastPublished.bind(null, podcast.id, !podcast.published)}
      >
        <ConfirmDialog
          trigger="Delete"
          title="Delete this podcast?"
          confirmLabel="Yes, delete it"
          action={deletePodcast.bind(null, podcast.id)}
          variant="danger"
          confirmVariant="destructive"
        >
          <p>&ldquo;{podcast.title}&rdquo; will be removed from the website and from here. This can&apos;t be undone.</p>
        </ConfirmDialog>
      </PublishControls>
      <PodcastEditor key={podcast.updated_at ?? "new"} podcast={podcast} action={savePodcast.bind(null, podcast.id)} saveLabel="Save" />
    </div>
  );
}
