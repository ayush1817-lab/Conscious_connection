"use client";

import Image from "next/image";
import { useState } from "react";
import { youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/content/youtube";
import { PlayIcon } from "./icons";

// Click-to-load YouTube player (spec section 5): only a thumbnail loads until the
// visitor presses play, so pages stay light and YouTube sets no cookies until then.
export function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`${youtubeEmbedUrl(videoId)}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-card border-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-card bg-text"
    >
      <Image src={youtubeThumbnailUrl(videoId)} alt="" fill sizes="(min-width: 768px) 640px, 100vw" className="object-cover opacity-90" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-transform group-hover:scale-105">
          <PlayIcon size={28} />
        </span>
      </span>
      <span className="sr-only">Play {title}</span>
    </button>
  );
}
