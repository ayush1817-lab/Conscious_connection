"use client";

import { useActionState, useState } from "react";
import { IMAGE_TARGETS } from "@/lib/content/images";
import { RichText } from "@/lib/content/rich-text";
import { publicImageUrl } from "@/lib/storage";
import { FormError, SaveButton, UnsavedNote } from "./form-bits";
import { ImagePicker } from "./image-picker";
import { TextEditor } from "./text-editor";
import { useUnsavedChanges } from "./use-unsaved-changes";

type Section = { id: string; heading: string; body: string; image_path: string | null };
type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

// A8 Homepage / About: one section's editor with a live preview beside it.
export function SectionEditor({ title, section, action }: { title: string; section: Section; action: Action }) {
  const [heading, setHeading] = useState(section.heading);
  const [body, setBody] = useState(section.body);
  const [image, setImage] = useState(section.image_path);
  const [state, formAction] = useActionState(action, {});
  const dirty = heading !== section.heading || body !== section.body || image !== section.image_path;
  useUnsavedChanges(dirty);

  return (
    <section aria-label={title} className="rounded-card border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor={`${section.id}-heading`} className="mb-1 block font-medium">
              Heading
            </label>
            <input
              id={`${section.id}-heading`}
              name="heading"
              value={heading}
              maxLength={150}
              onChange={(e) => setHeading(e.target.value)}
              className="min-h-tap w-full rounded-control border border-control-border bg-surface px-3"
            />
          </div>
          <TextEditor label="Text" name="body" value={body} onChange={setBody} rows={5} maxLength={3000} />
          <ImagePicker label="Image" name="image_path" target={IMAGE_TARGETS.sections} value={image} onChange={setImage} />
          <FormError error={state.error} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <SaveButton dirty={dirty} />
            <UnsavedNote dirty={dirty} />
          </div>
        </form>
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Preview</p>
          <div className="space-y-3 rounded-card border border-dashed border-border bg-background p-4">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicImageUrl("content", image)} alt="" className="aspect-[16/9] w-full rounded-control object-cover" />
            ) : null}
            <h3 className="text-xl font-semibold">{heading || "Heading"}</h3>
            {body ? <RichText text={body} /> : <p className="text-muted">Your text will appear here.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
