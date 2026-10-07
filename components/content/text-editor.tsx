"use client";

import { useId, useRef } from "react";

// Plain textarea with Bold and Italic buttons that wrap the selected text in
// **…** or *…* (rendered by RichText).
export function TextEditor({
  label,
  name,
  value,
  onChange,
  rows = 8,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  function wrap(marker: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || "text";
    const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    });
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      <div className="rounded-control border border-control-border bg-surface">
        <div role="toolbar" aria-label="Formatting" className="flex gap-1 border-b border-border p-1">
          <button type="button" onClick={() => wrap("**")} className="min-h-tap min-w-tap rounded-control font-bold hover:bg-background" aria-label="Bold">
            B
          </button>
          <button type="button" onClick={() => wrap("*")} className="min-h-tap min-w-tap rounded-control italic hover:bg-background" aria-label="Italic">
            I
          </button>
        </div>
        <textarea
          ref={ref}
          id={id}
          name={name}
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-hint`}
          className="block w-full resize-y rounded-b-control bg-surface px-3 py-2 text-text"
        />
      </div>
      <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
        Leave a blank line between paragraphs. **Two stars** make bold text, *one star* makes italics.
      </p>
    </div>
  );
}
