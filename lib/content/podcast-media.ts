import { AUDIO_BUCKET } from "./podcast-audio";
import { spotifyEpisodeId } from "./spotify";
import { youtubeVideoId } from "./youtube";
import { publicImageUrl } from "@/lib/storage";

export type PodcastSource = "youtube" | "spotify" | "audio" | "link";

export type PodcastMediaFields = {
  source: PodcastSource;
  youtube_url: string | null;
  spotify_url: string | null;
  audio_path: string | null;
  link_url?: string | null;
};

export type PodcastMedia =
  | { kind: "youtube"; videoId: string }
  | { kind: "spotify"; episodeId: string }
  | { kind: "audio"; url: string; type: string }
  | { kind: "link"; url: string; host: string };

export const SOURCE_LABELS: Record<PodcastSource, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  audio: "Audio file",
  link: "Web link",
};

// A podcast web link: any http(s) address. Returns the cleaned URL and its
// site name (without "www."), or null if it isn't a web address.
export function podcastLink(value: string): { url: string; host: string } | null {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes(".")) return null;
    return { url: url.toString(), host: url.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

// What to play for an episode, or null if its link or file is missing or broken.
export function podcastMedia(p: PodcastMediaFields): PodcastMedia | null {
  if (p.source === "youtube") {
    const videoId = p.youtube_url ? youtubeVideoId(p.youtube_url) : null;
    return videoId ? { kind: "youtube", videoId } : null;
  }
  if (p.source === "spotify") {
    const episodeId = p.spotify_url ? spotifyEpisodeId(p.spotify_url) : null;
    return episodeId ? { kind: "spotify", episodeId } : null;
  }
  if (p.source === "link") {
    const link = p.link_url ? podcastLink(p.link_url) : null;
    return link ? { kind: "link", ...link } : null;
  }
  if (!p.audio_path) return null;
  return { kind: "audio", url: publicImageUrl(AUDIO_BUCKET, p.audio_path), type: p.audio_path.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg" };
}
