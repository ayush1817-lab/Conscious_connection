"use client";

import { useRef, useState } from "react";
import { IMAGE_TARGETS } from "@/lib/content/images";
import { uploadImage } from "./image-picker";

// "Upload images" on the Gallery tab: pick several at once. Each is uploaded
// to Storage from the browser, then the good ones are added to the gallery.
export function GalleryUploader({ addImages }: { addImages: (paths: string[]) => Promise<{ error?: string }> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    const paths: string[] = [];
    const errors: string[] = [];
    for (const [i, file] of list.entries()) {
      setProgress(`Uploading ${i + 1} of ${list.length}…`);
      const result = await uploadImage(file, IMAGE_TARGETS.gallery);
      if ("error" in result) errors.push(result.error);
      else paths.push(result.path);
    }
    if (paths.length) {
      setProgress("Adding to the gallery…");
      const result = await addImages(paths);
      if (result.error) errors.push(result.error);
    }
    setProgress(null);
    setProblems(errors);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id="gallery-upload"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => upload(e.target.files)}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          disabled={!!progress}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-tap items-center justify-center rounded-control bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
        >
          {progress ?? "+ Upload images"}
        </button>
        <p className="text-sm text-muted">Choose one or more JPG, PNG or WebP images, up to 5MB each.</p>
      </div>
      <p aria-live="polite" className="sr-only">
        {progress ?? ""}
      </p>
      {problems.length ? (
        <div role="alert" className="rounded-control border border-danger bg-surface px-4 py-3 text-danger">
          <p className="font-medium">Some images weren&apos;t added:</p>
          <ul className="mt-1 list-disc pl-5">
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
