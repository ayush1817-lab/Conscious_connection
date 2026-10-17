import { AUDIO_BUCKET } from "./podcast-audio";
import { spotifyEpisodeId } from "./spotify";
import { youtubeVideoId } from "./youtube";
import { publicImageUrl } from "@/lib/storage";

export type PodcastSource = "youtube" | "spotify" | "audio";

export type PodcastMediaFields = {
  source: PodcastSource;
  youtube_url: string | null;
  spotify_url: string | null;
  audio_path: string | null;
};

export type PodcastMedia =
  | { kind: "youtube"; videoId: string }
  | { kind: "spotify"; episodeId: string }
  | { kind: "audio"; url: string; type: string };

export const SOURCE_LABELS: Record<PodcastSource, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  audio: "Audio file",
};

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
  if (!p.audio_path) return null;
  return { kind: "audio", url: publicImageUrl(AUDIO_BUCKET, p.audio_path), type: p.audio_path.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg" };
}
