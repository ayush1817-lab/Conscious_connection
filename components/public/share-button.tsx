"use client";

import { useState } from "react";
import { ShareIcon } from "./icons";

// Opens the phone's share sheet (WhatsApp, Instagram, ...) where supported,
// otherwise copies the link.
export function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return; // they closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      window.prompt("Copy this link to share the event:", url);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-tap items-center gap-2 rounded-control border border-border bg-surface px-4 font-medium hover:bg-hero"
      >
        <ShareIcon size={18} />
        Share this event
      </button>
      <span role="status" className="ml-3 text-success">
        {copied ? "Link copied" : ""}
      </span>
    </>
  );
}
