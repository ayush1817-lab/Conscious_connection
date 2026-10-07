"use client";

import { useActionState, useState } from "react";
import { FormError } from "./form-bits";
import { useUnsavedChanges } from "./use-unsaved-changes";

type Action = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

export function CaptionForm({ id, caption, action }: { id: string; caption: string; action: Action }) {
  const [value, setValue] = useState(caption);
  const [state, formAction, pending] = useActionState(action, {});
  const dirty = value !== caption;
  useUnsavedChanges(dirty);

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor={`caption-${id}`} className="block text-sm font-medium">
        Caption <span className="font-normal text-muted">(optional)</span>
      </label>
      <div className="flex gap-2">
        <input
          id={`caption-${id}`}
          name="caption"
          value={value}
          maxLength={200}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-tap min-w-0 flex-1 rounded-control border border-control-border bg-surface px-3"
        />
        {dirty ? (
          <button
            type="submit"
            disabled={pending}
            className="min-h-tap rounded-control bg-primary px-3 font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        ) : null}
      </div>
      <FormError error={state.error} />
    </form>
  );
}
