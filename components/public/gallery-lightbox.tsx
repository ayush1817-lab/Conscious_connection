"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryPhoto = { id: string; src: string; caption: string | null };

// The gallery grid. Clicking a photo opens it full screen, with previous/next
// buttons, arrow keys and swipe to move between photos, and Esc to close.
// Built on <dialog>, so focus stays inside while it's open and returns to the
// photo that opened it.
export function GalleryLightbox({ photos }: { photos: GalleryPhoto[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const touchStart = useRef<number | null>(null);
  const count = photos.length;

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = useCallback(() => dialogRef.current?.close(), []);
  const step = useCallback((by: number) => setIndex((i) => (i === null ? i : (i + by + count) % count)), [count]);

  // Stop the page behind from scrolling while the viewer is open.
  useEffect(() => {
    if (index === null) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [index]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else return;
    e.preventDefault();
  };

  const photo = index === null ? null : photos[index];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((img, i) => (
          <li key={img.id}>
            <figure>
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={img.caption ? `View full size: ${img.caption}` : `View photo ${i + 1} of ${count} full size`}
                className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-card bg-band focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Image
                  src={img.src}
                  // The caption below describes the photo, so the image itself needs no alt text.
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </button>
              {img.caption ? <figcaption className="mt-1 text-sm text-muted">{img.caption}</figcaption> : null}
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="Photo viewer"
        onClose={() => setIndex(null)}
        onKeyDown={onKeyDown}
        // A click on the dark area around the photo closes the viewer.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onTouchStart={(e) => {
          touchStart.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          const end = e.changedTouches[0]?.clientX;
          touchStart.current = null;
          if (start === null || end === undefined || Math.abs(end - start) < 50) return;
          step(end < start ? 1 : -1);
        }}
        className="gallery-lightbox m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-white backdrop:bg-black/95"
      >
        {photo ? (
          <div className="flex h-full flex-col" onClick={(e) => e.target === e.currentTarget && close()}>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="text-sm text-white/80" aria-live="polite">
                {index! + 1} / {count}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="relative min-h-0 flex-1" onClick={(e) => e.target === e.currentTarget && close()}>
              <Image
                key={photo.id}
                src={photo.src}
                alt={photo.caption ?? ""}
                fill
                sizes="100vw"
                preload
                className="pointer-events-none object-contain px-2 sm:px-20"
              />
              {count > 1 ? (
                <>
                  <NavButton side="left" onClick={() => step(-1)} />
                  <NavButton side="right" onClick={() => step(1)} />
                </>
              ) : null}
            </div>
            <p className="min-h-12 px-4 py-3 text-center text-sm text-white/90">{photo.caption}</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-white sm:size-12 ${side === "left" ? "left-2 sm:left-4" : "right-2 sm:right-4"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={side === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}
