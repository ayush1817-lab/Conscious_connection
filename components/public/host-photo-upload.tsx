"use client";

import { useActionState, useId, useRef, useState } from "react";
import type { PhotoState } from "@/app/(public)/host/[token]/photo-actions";
import { imageProblem } from "@/lib/content/images";
import { prepareImage } from "@/lib/content/prepare-image";
import { CAPTION_MAX, MAX_PHOTOS_PER_SEND, PHOTO_BUCKET } from "@/lib/host/photos";
import { createClient } from "@/lib/supabase/browser";
import { ConsentField, FormAlert } from "./forms/fields";
import { UploadIcon } from "./icons";

type Ticket = { path: string; token: string } | { error: string };
type Picked = { path: string; preview: string; caption: string; name: string };

// "Add photos from your event" on the private host page. Each photo is resized
// in the browser, uploaded to the private bucket through a signed URL, and only
// sent to the team (with its description) when the host presses Send.
export function HostPhotoUpload({
  requestUpload,
  action,
  remaining,
}: {
  requestUpload: (type: string, size: number) => Promise<Ticket>;
  action: (prev: PhotoState, formData: FormData) => Promise<PhotoState>;
  remaining: number;
}) {
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState(async (prev: PhotoState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.sent) setPhotos([]);
    return result;
  }, {});
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const limit = Math.min(MAX_PHOTOS_PER_SEND, remaining);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, Math.max(0, limit - photos.length));
    const errors: string[] = files.length > list.length ? [`You can send up to ${limit} photos at a time, so only the first ${list.length} were added.`] : [];
    const added: Picked[] = [];
    for (const [i, picked] of list.entries()) {
      setProgress(`Uploading ${i + 1} of ${list.length}…`);
      try {
        const file = await prepareImage(picked);
        const local = imageProblem(file);
        if (local) {
          errors.push(local);
          continue;
        }
        const ticket = await requestUpload(file.type, file.size);
        if ("error" in ticket) {
          errors.push(ticket.error);
          continue;
        }
        const { error } = await createClient().storage.from(PHOTO_BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
        if (error) errors.push(`"${picked.name}" couldn't be uploaded. Please try again.`);
        else added.push({ path: ticket.path, preview: URL.createObjectURL(file), caption: "", name: picked.name });
      } catch {
        errors.push(`"${picked.name}" couldn't be uploaded. Check your connection and try again.`);
      }
    }
    setPhotos((current) => [...current, ...added]);
    setProblems(errors);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (remaining <= 0) return <p className="text-muted">You&apos;ve sent the most photos we can take for one event. Thank you!</p>;

  return (
    <form action={formAction} className="space-y-5">
      {state.sent ? (
        <p role="status" className="rounded-card border-2 border-success bg-surface p-4 font-medium">
          Thanks! {state.sent === 1 ? "Your photo has" : `Your ${state.sent} photos have`} been sent. Our team will check{" "}
          {state.sent === 1 ? "it" : "them"} before {state.sent === 1 ? "it goes" : "they go"} in the gallery.
        </p>
      ) : null}
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <input type="hidden" name="photos" value={JSON.stringify(photos.map(({ path, caption }) => ({ path, caption })))} />

      <div>
        <input
          ref={inputRef}
          id={`${id}-files`}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose photos"
          onChange={(e) => add(e.target.files)}
        />
        <button
          type="button"
          disabled={!!progress || pending || photos.length >= limit}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-tap items-center justify-center gap-2 rounded-control border-2 border-primary bg-surface px-5 font-medium text-primary hover:bg-band disabled:opacity-60"
        >
          <UploadIcon size={20} />
          {progress ?? (photos.length ? "Add more photos" : "Choose photos")}
        </button>
        <p className="mt-1 text-sm text-muted">
          Up to {limit} at a time. JPG, PNG or WebP. Phone photos are resized automatically, and their location data is removed.
        </p>
        <p aria-live="polite" className="sr-only">
          {progress ?? ""}
        </p>
      </div>

      {problems.length ? (
        <div role="alert" className="rounded-control border border-danger bg-surface px-4 py-3 text-danger">
          <ul className="list-disc pl-5">
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {photos.length ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {photos.map((photo, i) => (
              <li key={photo.path} className="min-w-0 rounded-card border border-border bg-surface p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt="" className="aspect-[4/3] w-full rounded-control object-cover" />
                <label htmlFor={`${id}-caption-${i}`} className="mt-3 mb-1 block font-medium">
                  Describe photo {i + 1} <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id={`${id}-caption-${i}`}
                  value={photo.caption}
                  maxLength={CAPTION_MAX}
                  placeholder="e.g. Our group at the top of the hill"
                  onChange={(e) => setPhotos((all) => all.map((p) => (p.path === photo.path ? { ...p, caption: e.target.value } : p)))}
                  className="min-h-tap w-full rounded-control border border-control-border bg-surface px-3"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((all) => all.filter((p) => p.path !== photo.path))}
                  className="mt-2 min-h-tap font-medium text-danger underline underline-offset-4"
                >
                  Remove photo {i + 1}
                </button>
              </li>
            ))}
          </ul>
          <ConsentField id="consent" error={state.consentError}>
            Everyone who can be recognised in these photos is happy for them to be shared on the Conscious Connections website.
          </ConsentField>
          <button
            type="submit"
            disabled={pending || !!progress}
            aria-busy={pending || undefined}
            className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-control bg-primary px-6 font-medium text-on-primary hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Sending…" : photos.length === 1 ? "Send 1 photo for review" : `Send ${photos.length} photos for review`}
          </button>
        </>
      ) : null}
    </form>
  );
}
