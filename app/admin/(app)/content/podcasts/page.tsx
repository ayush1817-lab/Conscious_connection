import type { Metadata } from "next";
import { ItemRow, Thumb } from "@/components/content/item-list";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { youtubeThumbnailUrl, youtubeVideoId } from "@/lib/content/youtube";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Podcasts · Website content · Conscious Connections" };

export default async function PodcastsPage() {
  const supabase = await createClient();
  const { data: podcasts } = await supabase
    .from("podcasts")
    .select("id, title, youtube_url, published, published_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <ButtonLink href="/admin/content/podcasts/new">+ Add new podcast</ButtonLink>
      {podcasts?.length ? (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface px-4">
          {podcasts.map((p) => {
            const videoId = youtubeVideoId(p.youtube_url);
            return (
              <ItemRow
                key={p.id}
                href={`/admin/content/podcasts/${p.id}`}
                title={p.title}
                published={p.published}
                date={p.published && p.published_at ? formatDate(p.published_at) : null}
                detail={`YouTube link: ${p.youtube_url}`}
                thumb={<Thumb src={videoId ? youtubeThumbnailUrl(videoId) : null} label="No video" />}
              />
            );
          })}
        </ul>
      ) : (
        <EmptyState>No podcasts yet. Add the first one.</EmptyState>
      )}
    </div>
  );
}
