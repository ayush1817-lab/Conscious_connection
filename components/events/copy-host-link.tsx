"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// "Copy host link" on A5. Falls back to a selectable box if copying is blocked.
export function CopyHostLink({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="secondary" onClick={copy}>
        {state === "copied" ? "Copied ✓" : "Copy host link"}
      </Button>
      <p aria-live="polite" className="sr-only">
        {state === "copied" ? "Host link copied." : ""}
      </p>
      {state === "failed" ? (
        <label className="w-full text-left text-sm">
          <span className="mb-1 block">Couldn&apos;t copy automatically. Select the link and copy it:</span>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-tap w-full rounded-control border border-control-border bg-surface px-3"
          />
        </label>
      ) : null}
    </div>
  );
}
