"use client";

import { useId, useRef, useState } from "react";
import { createPosterUpload } from "@/app/(public)/submit-event/actions";
import { imageProblem } from "@/lib/content/images";
import { createClient } from "@/lib/supabase/browser";
import { publicImageUrl } from "@/lib/storage";
import { FieldError } from "./forms/fields";
import { UploadIcon } from "./icons";

// Optional event poster. The server checks the file and hands out a signed
// upload URL; the file then goes straight from the browser to Storage. The form
// sends only the resulting path (poster_path).
export function PosterUpload({
  defaultPath,
  error,
  disabled = false,
  onChange,
}: {
  defaultPath: string;
  error?: string;
  disabled?: boolean;
  onChange?: () => void;
}) {
  const [path, setPath] = useState(defaultPath);
  const [preview, setPreview] = useState<string | null>(defaultPath ? publicImageUrl("posters", defaultPath) : null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const shownError = problem ?? error;

  async function upload(file: File | undefined) {
    if (!file) return;
    setProblem(null);
    const local = imageProblem(file);
    if (local) return setProblem(local);
    setBusy(true);
    try {
      const ticket = await createPosterUpload(file.type, file.size);
      if ("error" in ticket) return setProblem(ticket.error);
      const { error: uploadError } = await createClient().storage.from("posters").uploadToSignedUrl(ticket.path, ticket.token, file, {
        contentType: file.type,
      });
      if (uploadError) return setProblem("The poster couldn't be uploaded. Please try again.");
      setPath(ticket.path);
      setPreview(URL.createObjectURL(file));
      onChange?.();
    } catch {
      setProblem("The poster couldn't be uploaded. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="group">
      <input type="hidden" name="poster_path" value={path} />
      <p id={`${id}-label`} className="mb-1 font-medium">
        Event poster <span className="font-normal text-muted">(optional)</span>
      </p>
      <p id={`${id}-hint`} className="mb-2 text-sm text-muted">
        JPG, PNG or WebP, up to 5MB. Without one, we show a simple card with your county and date.
      </p>
      <input
        ref={inputRef}
        id={`${id}-file`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint${shownError ? ` ${id}-error` : ""}`}
        aria-invalid={shownError ? true : undefined}
        disabled={disabled || busy}
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {preview ? (
        <div className="flex flex-wrap items-end gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
          <img src={preview} alt="Poster preview" className="h-40 w-auto max-w-full rounded-card border border-border object-cover" />
          {disabled ? null : (
            <div className="flex gap-2">
              <label
                htmlFor={`${id}-file`}
                className="inline-flex min-h-tap cursor-pointer items-center rounded-control border border-border bg-surface px-4 font-medium hover:bg-hero group-has-[input:focus-visible]:outline-3 group-has-[input:focus-visible]:outline-primary"
              >
                {busy ? "Uploading…" : "Change"}
              </label>
              <button
                type="button"
                className="min-h-tap rounded-control px-4 font-medium text-danger underline underline-offset-4"
                onClick={() => {
                  setPath("");
                  setPreview(null);
                  onChange?.();
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <label
          htmlFor={`${id}-file`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-6 text-center ${
            dragging ? "border-primary bg-hero" : "border-control-border bg-surface hover:bg-hero"
          } group-has-[input:focus-visible]:outline-3 group-has-[input:focus-visible]:outline-primary`}
        >
          <UploadIcon size={28} className="text-primary" />
          <span className="font-medium">{busy ? "Uploading…" : "Choose an image"}</span>
          <span className="text-sm text-muted">or drag and drop it here</span>
        </label>
      )}
      <div role="status" className="sr-only">
        {busy ? "Uploading poster" : ""}
      </div>
      <FieldError id={id} error={shownError ?? undefined} />
    </div>
  );
}
