"use client";

import { useActionState, useState } from "react";
import { youtubeEmbedUrl, youtubeVideoId } from "@/lib/content/youtube";
import { FormError, SaveButton, UnsavedNote } from "./form-bits";
import { useUnsavedChanges } from "./use-unsaved-changes";

type Podcast = { title: string; description: string; youtube_url: string };
type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

const EMPTY: Podcast = { title: "", description: "", youtube_url: "" };
const field = "min-h-tap w-full rounded-control border border-control-border bg-surface px-3";

// A8 Podcasts: title, short description and a YouTube link, with the video
// shown as soon as a valid link is pasted.
export function PodcastEditor({ podcast = EMPTY, action, saveLabel }: { podcast?: Podcast; action: Action; saveLabel: string }) {
  const [title, setTitle] = useState(podcast.title);
  const [description, setDescription] = useState(podcast.description);
  const [url, setUrl] = useState(podcast.youtube_url);
  const [state, formAction] = useActionState(action, {});
  const dirty = title !== podcast.title || description !== podcast.description || url !== podcast.youtube_url;
  useUnsavedChanges(dirty);
  const videoId = youtubeVideoId(url);
  const badLink = url.trim() !== "" && !videoId;

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
        <div>
          <label htmlFor="podcast-url" className="mb-1 block font-medium">
            YouTube link
          </label>
          <input
            id="podcast-url"
            name="youtube_url"
            type="url"
            inputMode="url"
            placeholder="https://youtu.be/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={badLink || undefined}
            aria-describedby="podcast-url-hint"
            className={field}
          />
          <p id="podcast-url-hint" className={`mt-1 text-sm ${badLink ? "font-medium text-danger" : "text-muted"}`}>
            {badLink
              ? "That doesn't look like a YouTube video link. Copy it from the Share button on YouTube."
              : "On YouTube, press Share under the video and copy the link."}
          </p>
        </div>
        <FormError error={state.error} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <SaveButton dirty={dirty} label={saveLabel} />
          <UnsavedNote dirty={dirty} />
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-muted">Preview</p>
        {videoId ? (
          <iframe
            src={youtubeEmbedUrl(videoId)}
            title={`YouTube video: ${title || "podcast preview"}`}
            className="aspect-video w-full rounded-card border border-border"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-card border border-dashed border-border bg-background px-4 text-center text-muted">
            Paste a YouTube link to see the video here.
          </div>
        )}
      </div>
    </form>
  );
}
