import { spotifyEmbedUrl } from "@/lib/content/spotify";
import type { PodcastMedia } from "@/lib/content/podcast-media";
import { buttonClass } from "@/components/ui/button";
import { Doodle } from "./doodles";
import { YouTubeEmbed } from "./youtube-embed";

// Plays an episode from wherever it lives: YouTube (click to load), a Spotify
// embed, an uploaded audio file with the browser's own accessible controls,
// or a plain web link (Linktree, Apple Podcasts...) that opens in a new tab.
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
  if (media.kind === "link") return <PodcastLinkCard url={media.url} host={media.host} title={title} />;
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

// A podcast that lives on another website: a card with a Listen button.
export function PodcastLinkCard({ url, host, title }: { url: string; host: string; title: string }) {
  return (
    <div className="podcast-link-card relative overflow-hidden rounded-card border border-border bg-background p-6 text-text">
      <Doodle name="sparkle" tone="lilac" className="podcast-link-doodle" />
      <p className="font-heading text-lg font-semibold">Listen to the episode</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Listen now: ${title} (opens ${host} in a new tab)`}
        className={buttonClass("primary", "mt-4")}
      >
        Listen now
      </a>
      <p className="mt-3 text-sm text-muted">Opens on {host}</p>
    </div>
  );
}
