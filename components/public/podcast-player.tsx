import { spotifyEmbedUrl } from "@/lib/content/spotify";
import type { PodcastMedia } from "@/lib/content/podcast-media";
import Image from "next/image";
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
  if (media.kind === "link") return <PodcastLinkCard url={media.url} host={media.host} cover={media.cover} title={title} />;
  return (
    <div className="rounded-card border border-border bg-background p-4 text-text">
      {media.cover ? (
        <div className="relative mb-3 aspect-square w-28 overflow-hidden rounded-control">
          <Image src={media.cover} alt="" fill sizes="112px" className="object-cover" />
        </div>
      ) : null}
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

// A podcast that lives on another website: a card with a Listen button, and
// the cover photo (if there is one) with a play badge that opens it too.
export function PodcastLinkCard({ url, host, title, cover }: { url: string; host: string; title: string; cover?: string | null }) {
  const label = `Listen now: ${title} (opens ${host} in a new tab)`;
  return (
    <div className="podcast-link-card relative overflow-hidden rounded-card border border-border bg-background text-text">
      {cover ? (
        <a href={url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden className="podcast-link-cover group relative block aspect-video overflow-hidden">
          {/* Decorative here: the title and Listen button say what it is. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
          <span className="podcast-play-badge" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
          </span>
        </a>
      ) : null}
      <div className="relative p-6">
        {cover ? null : <Doodle name="sparkle" tone="lilac" className="podcast-link-doodle" />}
        <p className="font-heading text-lg font-semibold">Listen to the episode</p>
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className={buttonClass("primary", "mt-4")}>
          Listen now
        </a>
        <p className="mt-3 text-sm text-muted">Opens on {host}</p>
      </div>
    </div>
  );
}
