"use client";

import { useActionState, useState } from "react";
import { IMAGE_TARGETS } from "@/lib/content/images";
import { FormError, SaveButton, UnsavedNote } from "./form-bits";
import { ImagePicker } from "./image-picker";
import { TextEditor } from "./text-editor";
import { useUnsavedChanges } from "./use-unsaved-changes";

type Story = { title: string; body: string; cover_path: string | null; author_name?: string | null };
type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

const EMPTY: Story = { title: "", body: "", cover_path: null, author_name: null };

// A8 Stories: title, cover image and text. Used for new and existing stories.
export function StoryEditor({ story = EMPTY, action, saveLabel }: { story?: Story; action: Action; saveLabel: string }) {
  const [title, setTitle] = useState(story.title);
  const [body, setBody] = useState(story.body);
  const [cover, setCover] = useState(story.cover_path);
  const [author, setAuthor] = useState(story.author_name ?? "");
  const [state, formAction] = useActionState(action, {});
  const dirty = title !== story.title || body !== story.body || cover !== story.cover_path || author !== (story.author_name ?? "");
  useUnsavedChanges(dirty);

  return (
    <form action={formAction} className="space-y-4 rounded-card border border-border bg-surface p-4">
      <div>
        <label htmlFor="story-title" className="mb-1 block font-medium">
          Title
        </label>
        <input
          id="story-title"
          name="title"
          value={title}
          maxLength={150}
          onChange={(e) => setTitle(e.target.value)}
          className="min-h-tap w-full rounded-control border border-control-border bg-surface px-3"
        />
      </div>
      <div>
        <label htmlFor="story-author" className="mb-1 block font-medium">
          Written by <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="story-author"
          name="author_name"
          value={author}
          maxLength={80}
          onChange={(e) => setAuthor(e.target.value)}
          aria-describedby="story-author-hint"
          className="min-h-tap w-full rounded-control border border-control-border bg-surface px-3"
        />
        <p id="story-author-hint" className="mt-1 text-sm text-muted">Shown as &ldquo;By …&rdquo;. Leave empty for no name.</p>
      </div>
      <ImagePicker label="Cover image" name="cover_path" target={IMAGE_TARGETS.stories} value={cover} onChange={setCover} />
      <TextEditor label="Story" name="body" value={body} onChange={setBody} rows={14} maxLength={20000} />
      <FormError error={state.error} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <SaveButton dirty={dirty} label={saveLabel} />
        <UnsavedNote dirty={dirty} />
      </div>
    </form>
  );
}
