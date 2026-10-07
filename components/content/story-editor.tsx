"use client";

import { useActionState, useState } from "react";
import { IMAGE_TARGETS } from "@/lib/content/images";
import { FormError, SaveButton, UnsavedNote } from "./form-bits";
import { ImagePicker } from "./image-picker";
import { TextEditor } from "./text-editor";
import { useUnsavedChanges } from "./use-unsaved-changes";

type Story = { title: string; body: string; cover_path: string | null };
type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

const EMPTY: Story = { title: "", body: "", cover_path: null };

// A8 Stories: title, cover image and text. Used for new and existing stories.
export function StoryEditor({ story = EMPTY, action, saveLabel }: { story?: Story; action: Action; saveLabel: string }) {
  const [title, setTitle] = useState(story.title);
  const [body, setBody] = useState(story.body);
  const [cover, setCover] = useState(story.cover_path);
  const [state, formAction] = useActionState(action, {});
  const dirty = title !== story.title || body !== story.body || cover !== story.cover_path;
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
