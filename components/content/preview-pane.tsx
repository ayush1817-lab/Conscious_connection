"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentPage } from "@/lib/content/sections";
import type { Draft } from "./page-editor";
import type { PreviewMessage } from "./preview-canvas";

const WIDTHS = { computer: 1280, phone: 390 } as const;
type Device = keyof typeof WIDTHS;

// The website preview beside the content editor: the real page, in a frame,
// shrunk to fit. It is sent the unsaved text whenever it changes.
export function PreviewPane({
  page,
  drafts,
  active,
  liveHref,
  onPick,
}: {
  page: ContentPage;
  drafts: Record<string, Draft>;
  active: string | null;
  liveHref: string;
  onPick: (area: string) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<Device>("computer");
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  // Small screens: the preview opens on request, above the editor.
  const [shownOnMobile, setShownOnMobile] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pickRef = useRef(onPick);
  useEffect(() => {
    pickRef.current = onPick;
  });
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "cc-ready") setReady(true);
      if (event.data?.type === "cc-pick" && typeof event.data.area === "string") pickRef.current(event.data.area);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const width = WIDTHS[device];
  // The frame stays loaded while hidden (small screens), at a stand-in size.
  const scale = box.width ? Math.min(1, box.width / width) : 1;
  const height = box.height || 700;

  useEffect(() => {
    if (!ready) return;
    const message: PreviewMessage = { type: "cc-preview", rows: Object.fromEntries(Object.entries(drafts).map(([key, d]) => [key, { key, ...d }])), active, zoom: 1 / scale };
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, [ready, drafts, active, scale]);

  return (
    <aside aria-label="Website preview" className={`preview-pane ${shownOnMobile ? "is-shown" : ""}`}>
      <button type="button" className="preview-mobile-toggle" aria-expanded={shownOnMobile} onClick={() => setShownOnMobile((v) => !v)}>
        {shownOnMobile ? "Hide the preview" : "Show the website preview"}
      </button>
      <div className="preview-pane-inner">
        <div className="preview-toolbar">
          <p className="preview-toolbar-title">
            <span className="preview-live-dot" aria-hidden />
            Preview
            <span className="font-normal text-muted">· changes as you type</span>
          </p>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Preview size" className="preview-devices">
              {(Object.keys(WIDTHS) as Device[]).map((d) => (
                <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>
                  {d === "computer" ? "Computer" : "Phone"}
                </button>
              ))}
            </div>
            <a href={liveHref} target="_blank" rel="noreferrer" className="preview-open">
              Open live page<span className="sr-only"> (opens in a new tab)</span>
              <svg aria-hidden viewBox="0 0 24 24">
                <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
              </svg>
            </a>
          </div>
        </div>
        <div ref={boxRef} className="preview-viewport">
          <div className="preview-device" style={{ width: width * scale, height }} data-device={device}>
            <iframe
              ref={frameRef}
              src={`/admin/preview/${page}`}
              title="Preview of the website page you are editing"
              style={{ width, height: height / scale, transform: `scale(${scale})` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
