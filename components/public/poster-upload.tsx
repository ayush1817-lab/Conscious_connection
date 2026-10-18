"use client";

import { useId, useRef, useState } from "react";
import { createPosterUpload } from "@/app/(public)/submit-event/actions";
import { imageProblem } from "@/lib/content/images";
import { prepareImage } from "@/lib/content/prepare-image";
import { createClient } from "@/lib/supabase/browser";
import { publicImageUrl, type Bucket } from "@/lib/storage";
import { FieldError } from "./forms/fields";
import { UploadIcon } from "./icons";

type Ticket = { path: string; token: string } | { error: string };

// Optional event poster (or, with props, a story image). The server checks the
// file and hands out a signed upload URL; the file then goes straight from the
// browser to Storage. The form sends only the resulting path (`name`).
export function PosterUpload({
  defaultPath,
  error,
  disabled = false,
  onChange,
  name = "poster_path",
  label = "Event poster",
  hint = "JPG, PNG or WebP. Large phone photos are resized automatically. Without one, we show a simple card with your county and date.",
  bucket = "posters",
  requestUpload = createPosterUpload,
  noun = "poster",
}: {
  defaultPath: string;
  error?: string;
  disabled?: boolean;
  onChange?: () => void;
  name?: string;
  label?: string;
  hint?: string;
  bucket?: Bucket;
  requestUpload?: (type: string, size: number) => Promise<Ticket>;
  noun?: string;
}) {
  const [path, setPath] = useState(defaultPath);
  const [preview, setPreview] = useState<string | null>(defaultPath ? publicImageUrl(bucket, defaultPath) : null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const shownError = problem ?? error;

  async function upload(picked: File | undefined) {
    if (!picked) return;
    setProblem(null);
    // Phone photos are resized and compressed before upload.
    const file = await prepareImage(picked);
    const local = imageProblem(file);
    if (local) return setProblem(local);
    setBusy(true);
    try {
      const ticket = await requestUpload(file.type, file.size);
      if ("error" in ticket) return setProblem(ticket.error);
      const { error: uploadError } = await createClient().storage.from(bucket).uploadToSignedUrl(ticket.path, ticket.token, file, {
        contentType: file.type,
      });
      if (uploadError) return setProblem(`The ${noun} couldn't be uploaded. Please try again.`);
      setPath(ticket.path);
      setPreview(URL.createObjectURL(file));
      onChange?.();
    } catch {
      setProblem(`The ${noun} couldn't be uploaded. Check your connection and try again.`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="group">
      <input type="hidden" name={name} value={path} />
      <p id={`${id}-label`} className="mb-1 font-medium">
        {label} <span className="font-normal text-muted">(optional)</span>
      </p>
      <p id={`${id}-hint`} className="mb-2 text-sm text-muted">
        {hint}
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
          <img src={preview} alt={`${noun[0].toUpperCase()}${noun.slice(1)} preview`} className="h-40 w-auto max-w-full rounded-card border border-border object-cover" />
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
        {busy ? `Uploading ${noun}` : ""}
      </div>
      <FieldError id={id} error={shownError ?? undefined} />
    </div>
  );
}
