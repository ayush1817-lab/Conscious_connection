"use client";

import { useEffect, useState } from "react";

type Flash = { message: string; tone: "success" | "error" };

// Shows the one-off confirmation set by setFlash() and then clears it.
export function Toaster({ flash }: { flash: Flash | null }) {
  const [shown, setShown] = useState<Flash | null>(flash);

  useEffect(() => {
    if (!flash) return;
    setShown(flash);
    document.cookie = "cc_flash=; Max-Age=0; path=/";
    const timer = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(timer);
  }, [flash]);

  if (!shown) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className={`flex max-w-md items-start gap-3 rounded-card border bg-surface px-4 py-3 shadow-lg ${
          shown.tone === "error" ? "border-danger" : "border-success"
        }`}
      >
        <span aria-hidden className={shown.tone === "error" ? "text-danger" : "text-success"}>
          {shown.tone === "error" ? "!" : "✓"}
        </span>
        <p className="flex-1">{shown.message}</p>
        <button
          type="button"
          onClick={() => setShown(null)}
          className="-my-2 -mr-2 min-h-tap min-w-tap rounded-control text-muted hover:text-text"
          aria-label="Dismiss message"
        >
          ×
        </button>
      </div>
    </div>
  );
}
