import { spotifyEmbedUrl } from "@/lib/content/spotify";
import type { PodcastMedia } from "@/lib/content/podcast-media";
import { YouTubeEmbed } from "./youtube-embed";

// Plays an episode from wherever it lives: YouTube (click to load), a Spotify
// embed, or an uploaded audio file with the browser's own accessible controls.
export function PodcastPlayer({ media, title }: { media: PodcastMedia; title: string }) {
  if (media.kind === "youtube") return <YouTubeEmbed videoId={media.videoId} title={title} />;
  if (media.kind === "spotify") {
    return (
      <iframe
        src={spotifyEmbedUrl(media.episodeId)}
        title={`Spotify player: ${title}`}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        className="h-[152px] w-full rounded-card border-0"
      />
    );
  }
  return (
    <div className="rounded-card border border-border bg-background p-4">
      <audio controls preload="metadata" className="w-full" aria-label={`Listen: ${title}`}>
        <source src={media.url} type={media.type} />
        Your browser can&apos;t play this audio.{" "}
        <a href={media.url} className="text-primary underline underline-offset-4">
          Download the episode
        </a>
        .
      </audio>
      <a href={media.url} download className="mt-2 inline-flex min-h-tap items-center text-sm font-medium text-primary underline underline-offset-4">
        Download the episode<span className="sr-only">: {title}</span>
      </a>
    </div>
  );
}
