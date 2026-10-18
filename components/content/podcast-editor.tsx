"use client";

import { useActionState, useId, useRef, useState } from "react";
import { AUDIO_BUCKET, AUDIO_CONTENT_TYPE, AUDIO_FOLDER, audioKind, audioProblem } from "@/lib/content/podcast-audio";
import { podcastMedia, type PodcastSource } from "@/lib/content/podcast-media";
import { spotifyEmbedUrl } from "@/lib/content/spotify";
import { youtubeEmbedUrl } from "@/lib/content/youtube";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/browser";
import { FormError, SaveButton, UnsavedNote } from "./form-bits";
import { useUnsavedChanges } from "./use-unsaved-changes";

type Podcast = {
  title: string;
  description: string;
  source: PodcastSource;
  youtube_url: string | null;
  spotify_url: string | null;
  audio_path: string | null;
};
type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

const EMPTY: Podcast = { title: "", description: "", source: "youtube", youtube_url: "", spotify_url: "", audio_path: null };
const field = "min-h-tap w-full rounded-control border border-control-border bg-surface px-3";

const SOURCES: { value: PodcastSource; label: string; hint: string }[] = [
  { value: "youtube", label: "YouTube", hint: "Paste a video link" },
  { value: "spotify", label: "Spotify", hint: "Paste an episode link" },
  { value: "audio", label: "Audio file", hint: "Upload an MP3 or M4A" },
];

// A8 Podcasts: title, short description, and where the episode is: a YouTube
// link, a Spotify episode link or an uploaded audio file. The player is
// previewed as soon as the link or file is valid.
export function PodcastEditor({ podcast = EMPTY, action, saveLabel }: { podcast?: Podcast; action: Action; saveLabel: string }) {
  const [title, setTitle] = useState(podcast.title);
  const [description, setDescription] = useState(podcast.description);
  const [source, setSource] = useState<PodcastSource>(podcast.source);
  const [youtubeUrl, setYoutubeUrl] = useState(podcast.youtube_url ?? "");
  const [spotifyUrl, setSpotifyUrl] = useState(podcast.spotify_url ?? "");
  const [audioPath, setAudioPath] = useState<string | null>(podcast.audio_path);
  const [audioName, setAudioName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [state, formAction] = useActionState(action, {});
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const dirty =
    title !== podcast.title ||
    description !== podcast.description ||
    source !== podcast.source ||
    youtubeUrl !== (podcast.youtube_url ?? "") ||
    spotifyUrl !== (podcast.spotify_url ?? "") ||
    audioPath !== podcast.audio_path;
  useUnsavedChanges(dirty || uploading);

  const media = podcastMedia({ source, youtube_url: youtubeUrl, spotify_url: spotifyUrl, audio_path: audioPath });
  const typed = source === "youtube" ? youtubeUrl : source === "spotify" ? spotifyUrl : "";
  const badLink = source !== "audio" && typed.trim() !== "" && !media;

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    const problem = audioProblem(file);
    if (problem) {
      setUploadError(problem);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const kind = audioKind(file)!;
    const path = `${AUDIO_FOLDER}/${crypto.randomUUID()}.${kind}`;
    setUploading(true);
    try {
      const { error } = await createClient().storage.from(AUDIO_BUCKET).upload(path, file, { contentType: AUDIO_CONTENT_TYPE[kind] });
      if (error) setUploadError(`"${file.name}" couldn't be uploaded. Please try again.`);
      else {
        setAudioPath(path);
        setAudioName(file.name);
      }
    } catch {
      setUploadError("The file couldn't be uploaded. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="grid gap-6 rounded-card border border-border bg-surface p-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label htmlFor="podcast-title" className="mb-1 block font-medium">
            Title
          </label>
          <input id="podcast-title" name="title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="podcast-description" className="mb-1 block font-medium">
            Short description
          </label>
          <textarea
            id="podcast-description"
            name="description"
            rows={3}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-control border border-control-border bg-surface px-3 py-2"
          />
        </div>

        <fieldset>
          <legend className="mb-2 font-medium">Where is the episode?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {SOURCES.map((s) => (
              <label
                key={s.value}
                className="flex min-h-tap cursor-pointer items-start gap-2 rounded-control border border-control-border p-3 has-[:checked]:border-primary has-[:checked]:bg-hero"
              >
                <input type="radio" name="source" value={s.value} checked={source === s.value} onChange={() => setSource(s.value)} className="mt-1" />
                <span>
                  <span className="block font-medium">{s.label}</span>
                  <span className="block text-sm text-muted">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {source === "youtube" ? (
          <LinkField
            id="podcast-url"
            name="youtube_url"
            label="YouTube link"
            placeholder="https://youtu.be/…"
            value={youtubeUrl}
            onChange={setYoutubeUrl}
            bad={badLink}
            hint="On YouTube, press Share under the video and copy the link."
            badHint="That doesn't look like a YouTube video link. Copy it from the Share button on YouTube."
          />
        ) : null}
        {source === "spotify" ? (
          <LinkField
            id="podcast-spotify-url"
            name="spotify_url"
            label="Spotify episode link"
            placeholder="https://open.spotify.com/episode/…"
            value={spotifyUrl}
            onChange={setSpotifyUrl}
            bad={badLink}
            hint="In Spotify, open the episode, press Share and choose Copy link to episode."
            badHint="That doesn't look like a Spotify episode link. It should start with https://open.spotify.com/episode/"
          />
        ) : null}
        {source === "audio" ? (
          <div>
            <input type="hidden" name="audio_path" value={audioPath ?? ""} />
            <p id={`${id}-audio-label`} className="mb-1 font-medium">
              Audio file
            </p>
            <p id={`${id}-audio-hint`} className="mb-2 text-sm text-muted">
              MP3 or M4A, up to 50MB. Large files can take a minute to upload.
            </p>
            <input
              ref={fileRef}
              id={`${id}-audio`}
              type="file"
              accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
              aria-labelledby={`${id}-audio-label`}
              aria-describedby={`${id}-audio-hint${uploadError ? ` ${id}-audio-error` : ""}`}
              aria-invalid={uploadError ? true : undefined}
              disabled={uploading}
              onChange={(e) => upload(e.target.files?.[0])}
              className="sr-only"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor={`${id}-audio`}
                className="inline-flex min-h-tap cursor-pointer items-center rounded-control border border-border bg-surface px-4 font-medium hover:bg-band has-[+input:focus-visible]:outline-3"
              >
                {uploading ? "Uploading…" : audioPath ? "Choose a different file" : "Choose an audio file"}
              </label>
              <span className="text-sm text-muted">{audioName ?? (audioPath ? "An audio file is uploaded." : "No file yet.")}</span>
            </div>
            <div role="status" className="sr-only">
              {uploading ? "Uploading the audio file" : ""}
            </div>
            {uploadError ? (
              <p id={`${id}-audio-error`} className="mt-1 text-sm font-medium text-danger">
                {uploadError}
              </p>
            ) : null}
          </div>
        ) : null}

        <FormError error={state.error} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <SaveButton dirty={dirty && !uploading} label={saveLabel} />
          <UnsavedNote dirty={dirty} />
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-muted">Preview</p>
        {media?.kind === "youtube" ? (
          <iframe
            src={youtubeEmbedUrl(media.videoId)}
            title={`YouTube video: ${title || "podcast preview"}`}
            className="aspect-video w-full rounded-card border border-border"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : media?.kind === "spotify" ? (
          <iframe
            src={spotifyEmbedUrl(media.episodeId)}
            title={`Spotify player: ${title || "podcast preview"}`}
            className="h-[152px] w-full rounded-card border-0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        ) : media?.kind === "audio" ? (
          <audio controls preload="metadata" className="w-full" aria-label={`Listen: ${title || "podcast preview"}`} src={publicImageUrl(AUDIO_BUCKET, audioPath!)} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-card border border-dashed border-border bg-background px-4 text-center text-muted">
            {source === "audio" ? "Upload an audio file to listen to it here." : `Paste a ${source === "youtube" ? "YouTube" : "Spotify"} link to see the player here.`}
          </div>
        )}
      </div>
    </form>
  );
}

function LinkField({
  id,
  name,
  label,
  placeholder,
  value,
  onChange,
  bad,
  hint,
  badHint,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  bad: boolean;
  hint: string;
  badHint: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="url"
        inputMode="url"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={bad || undefined}
        aria-describedby={`${id}-hint`}
        className={field}
      />
      <p id={`${id}-hint`} className={`mt-1 text-sm ${bad ? "font-medium text-danger" : "text-muted"}`}>
        {bad ? badHint : hint}
      </p>
    </div>
  );
}
