"use client";

import { useId, useRef, useState } from "react";
import { imageProblem, newImagePath, type ImageTarget } from "@/lib/content/images";
import { createClient } from "@/lib/supabase/browser";
import { publicImageUrl } from "@/lib/storage";

// Upload straight from the browser to Supabase Storage (admin-only by RLS), so
// large images don't pass through the server. The form then saves the path.
export async function uploadImage(file: File, target: ImageTarget): Promise<{ path: string } | { error: string }> {
  const problem = imageProblem(file);
  if (problem) return { error: problem };
  const path = newImagePath(target.folder, file.type);
  const { error } = await createClient().storage.from(target.bucket).upload(path, file, { contentType: file.type });
  if (error) return { error: `"${file.name}" couldn't be uploaded. Please try again.` };
  return { path };
}

// Shows the current image with Upload/Change and Remove. Calls onChange with
// the new storage path (or null) once an upload finishes.
export function ImagePicker({
  label,
  target,
  value,
  onChange,
  name,
}: {
  label: string;
  target: ImageTarget;
  value: string | null;
  onChange: (path: string | null) => void;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await uploadImage(file, target);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if ("error" in result) setError(result.error);
    else onChange(result.path);
  }

  return (
    <div>
      <p id={`${id}-label`} className="mb-1 font-medium">
        {label}
      </p>
      <input type="hidden" name={name} value={value ?? ""} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-24 w-32 overflow-hidden rounded-control border border-border bg-background">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={publicImageUrl(target.bucket, value)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-muted">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            id={`${id}-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-hint`}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="min-h-tap rounded-control border border-control-border bg-surface px-4 font-medium hover:bg-background disabled:opacity-60"
          >
            {busy ? "Uploading…" : value ? "Change image" : "Upload image"}
          </button>
          {value && !busy ? (
            <button type="button" onClick={() => onChange(null)} className="min-h-tap px-2 text-left text-danger underline-offset-4 hover:underline">
              Remove image
            </button>
          ) : null}
        </div>
      </div>
      <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
        JPG, PNG or WebP, up to 5MB.
      </p>
      {error ? (
        <p role="alert" className="mt-1 font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
