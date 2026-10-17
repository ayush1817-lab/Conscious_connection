// Uploaded podcast audio (client feedback, Oct 2026): MP3 or M4A, up to 50MB,
// in the public "podcasts" bucket under episodes/<random id>.<ext>.

export const AUDIO_BUCKET = "podcasts";
export const AUDIO_FOLDER = "episodes";
export const AUDIO_MAX_BYTES = 50 * 1024 * 1024;

const TYPES: Record<string, "mp3" | "m4a"> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
};

// "mp3" / "m4a" for a picked file, from its type or (when the browser gives none) its name.
export function audioKind(file: { type: string; name: string }): "mp3" | "m4a" | null {
  if (TYPES[file.type]) return TYPES[file.type];
  const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  return ext === "mp3" || ext === "m4a" ? ext : null;
}

export const AUDIO_CONTENT_TYPE = { mp3: "audio/mpeg", m4a: "audio/mp4" } as const;

export function audioProblem(file: { type: string; name: string; size: number }): string | null {
  if (!audioKind(file)) return "Please choose an MP3 or M4A audio file.";
  if (file.size > AUDIO_MAX_BYTES) return "That file is over 50MB. Please export a smaller file (for example MP3 at 96–128 kbps).";
  return null;
}

export function isAudioPath(path: string) {
  return new RegExp(`^${AUDIO_FOLDER}/[0-9a-f-]{36}\\.(mp3|m4a)$`).test(path);
}
