// Accepts the ways people copy a Spotify episode link and returns the episode id,
// or null if it isn't one. The ?si=… share parameter is ignored.
//   https://open.spotify.com/episode/5LuIfZKKssTiQBRsgqFMVC?si=…
//   https://open.spotify.com/intl-en/episode/ID   https://open.spotify.com/embed/episode/ID
//   spotify:episode:ID
export function spotifyEpisodeId(input: string): string | null {
  const trimmed = input.trim();
  const uri = /^spotify:episode:([A-Za-z0-9]{22})$/.exec(trimmed);
  if (uri) return uri[1];
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname !== "open.spotify.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0]?.startsWith("intl-")) parts.shift();
  if (parts[0] === "embed") parts.shift();
  if (parts[0] !== "episode") return null;
  const id = parts[1] ?? "";
  return /^[A-Za-z0-9]{22}$/.test(id) ? id : null;
}

export function spotifyEpisodeUrl(id: string) {
  return `https://open.spotify.com/episode/${id}`;
}

export function spotifyEmbedUrl(id: string) {
  return `https://open.spotify.com/embed/episode/${id}`;
}
