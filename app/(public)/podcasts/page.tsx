import type { Metadata } from "next";
import { PageIntro } from "@/components/public/section-heading";
import { YouTubeEmbed } from "@/components/public/youtube-embed";
import { youtubeVideoId } from "@/lib/content/youtube";
import { formatDate } from "@/lib/format";
import { getPodcasts } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "Podcasts",
  description: "Conversations about community, identity and life in rural Ireland.",
};

export default async function PodcastsPage() {
  const podcasts = (await getPodcasts())
    .map((p) => ({ ...p, videoId: youtubeVideoId(p.youtube_url) }))
    .filter((p): p is typeof p & { videoId: string } => p.videoId !== null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageIntro title="Podcasts">Conversations about community, identity and life in rural Ireland.</PageIntro>
      {podcasts.length ? (
        <ul className="space-y-8">
          {podcasts.map((p) => (
            <li key={p.id} className="grid gap-4 rounded-card border border-border bg-surface p-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:p-6">
              <YouTubeEmbed videoId={p.videoId} title={p.title} />
              <div>
                <h2 className="font-heading text-xl font-semibold">{p.title}</h2>
                {p.published_at ? <p className="mt-1 text-sm text-muted">{formatDate(p.published_at)}</p> : null}
                {p.description ? <p className="mt-2 text-muted">{p.description}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-border bg-surface p-6 text-muted">No episodes yet. Check back soon.</p>
      )}
    </div>
  );
}
