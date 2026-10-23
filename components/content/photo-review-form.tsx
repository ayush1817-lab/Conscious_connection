"use client";

import { useActionState, useId } from "react";
import { FormError } from "./form-bits";

type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

// A host's photo waiting for review: check or edit its caption, then approve.
export function PhotoReviewForm({ caption, action }: { caption: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  const id = useId();
  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        Caption <span className="font-normal text-muted">(optional, also read out by screen readers)</span>
      </label>
      <input
        id={id}
        name="caption"
        defaultValue={caption}
        maxLength={200}
        className="min-h-tap w-full rounded-control border border-control-border bg-surface px-3"
      />
      <FormError error={state.error} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="min-h-tap w-full rounded-control bg-primary px-4 font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Approving…" : "Approve and add to gallery"}
      </button>
    </form>
  );
}
