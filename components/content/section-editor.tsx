"use client";

import { useActionState, useId, useState } from "react";
import { IMAGE_TARGETS } from "@/lib/content/images";
import { RichText } from "@/lib/content/rich-text";
import type { SectionDef } from "@/lib/content/sections";
import { publicImageUrl } from "@/lib/storage";
import { FormError, SaveButton, UnsavedNote } from "./form-bits";
import { ImagePicker } from "./image-picker";
import { TextEditor } from "./text-editor";
import { useUnsavedChanges } from "./use-unsaved-changes";

type Section = { id: string; heading: string; body: string; image_path: string | null; image_alt: string | null };
type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

const input = "min-h-tap w-full rounded-control border border-control-border bg-surface px-3";

// A8 Homepage / About: one section's editor with a live preview beside it.
// Which fields show depends on the section (see lib/content/sections.ts).
export function SectionEditor({ def, section, action }: { def: SectionDef; section: Section; action: Action }) {
  const [heading, setHeading] = useState(section.heading);
  const [body, setBody] = useState(section.body);
  const [image, setImage] = useState(section.image_path);
  const [alt, setAlt] = useState(section.image_alt ?? "");
  const [state, formAction] = useActionState(action, {});
  const id = useId();
  const dirty = heading !== section.heading || body !== section.body || image !== section.image_path || alt !== (section.image_alt ?? "");
  useUnsavedChanges(dirty);
  const isPhoto = def.heading !== "required" && !def.body;

  return (
    <section aria-label={def.title} className="rounded-card border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">{def.title}</h2>
      {def.hint ? <p className="text-sm text-muted">{def.hint}</p> : null}
      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        <form action={formAction} className="space-y-4">
          {def.image ? (
            <ImagePicker label={isPhoto ? "Photo" : "Image"} name="image_path" target={IMAGE_TARGETS.sections} value={image} onChange={setImage} />
          ) : null}
          {def.image && image ? (
            <div>
              <label htmlFor={`${id}-alt`} className="mb-1 block font-medium">
                Describe the image
              </label>
              <input
                id={`${id}-alt`}
                name="image_alt"
                value={alt}
                maxLength={300}
                onChange={(e) => setAlt(e.target.value)}
                aria-describedby={`${id}-alt-hint`}
                className={input}
              />
              <p id={`${id}-alt-hint`} className="mt-1 text-sm text-muted">
                For people who use screen readers, e.g. &ldquo;A group walking along a forest path in autumn&rdquo;.
              </p>
            </div>
          ) : null}
          {def.heading !== "none" ? (
            <div>
              <label htmlFor={`${id}-heading`} className="mb-1 block font-medium">
                {def.headingLabel ?? (def.heading === "optional" ? "Heading (optional)" : "Heading")}
              </label>
              <input id={`${id}-heading`} name="heading" value={heading} maxLength={150} onChange={(e) => setHeading(e.target.value)} className={input} />
            </div>
          ) : null}
          {def.body ? <TextEditor label={def.bodyLabel ?? "Text"} name="body" value={body} onChange={setBody} rows={5} maxLength={3000} /> : null}
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
              <img src={publicImageUrl("content", image)} alt={alt} className="aspect-[16/9] w-full rounded-control object-cover" />
            ) : isPhoto ? (
              <p className="text-muted">No photo yet, so nothing is shown on the website.</p>
            ) : null}
            {def.heading !== "none" ? (
              isPhoto ? (
                heading ? <p className="text-sm text-muted">{heading}</p> : null
              ) : (
                <h3 className="text-xl font-semibold">{heading || def.defaults.heading || "Heading"}</h3>
              )
            ) : null}
            {def.body ? body ? <RichText text={body} /> : <p className="text-muted">Your text will appear here.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
