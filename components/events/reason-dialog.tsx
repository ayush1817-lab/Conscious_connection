"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button, buttonClass } from "@/components/ui/button";

export type ReasonAction = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

// A4 – Reason dialog (Request changes, Decline, and later Take down).
// The reason is required and is emailed to the host.
export function ReasonDialog({
  trigger,
  title,
  submitLabel,
  hostName,
  hostEmail,
  action,
  variant = "secondary",
}: {
  trigger: string;
  title: string;
  submitLabel: string;
  hostName: string;
  hostEmail: string;
  action: ReasonAction;
  variant?: "secondary" | "danger";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction] = useActionState(action, {});
  const id = useId();

  // Keep the dialog open and focus the box when the server sends back an error.
  useEffect(() => {
    if (state.error) textRef.current?.focus();
  }, [state]);

  return (
    <>
      <Button variant={variant} className="w-full sm:w-auto" onClick={() => dialogRef.current?.showModal()}>
        {trigger}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-card border border-border bg-surface p-0 text-text backdrop:bg-text/40"
      >
        <form action={formAction} noValidate className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 id={`${id}-title`} className="text-xl font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="-mt-2 -mr-2 min-h-tap min-w-tap rounded-control text-xl text-muted hover:text-text"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div>
            <label htmlFor={`${id}-reason`} className="mb-1 block font-medium">
              Explain your decision to the host <span className="font-normal text-muted">(required)</span>
            </label>
            <textarea
              ref={textRef}
              id={`${id}-reason`}
              name="reason"
              rows={5}
              maxLength={1000}
              aria-required
              aria-invalid={state.error ? true : undefined}
              aria-describedby={`${id}-hint${state.error ? ` ${id}-error` : ""}`}
              placeholder="Type your message here…"
              className="w-full rounded-control border border-control-border bg-surface px-3 py-2 text-text placeholder:text-muted"
            />
            {state.error ? (
              <p id={`${id}-error`} role="alert" className="mt-1 font-medium text-danger">
                {state.error}
              </p>
            ) : null}
            <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
              This will be emailed to {hostName} ({hostEmail}).
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={buttonClass("secondary", "w-full sm:w-auto")}
            >
              Cancel
            </button>
            <SubmitButton label={submitLabel} />
          </div>
        </form>
      </dialog>
    </>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Sending…" : label}
    </Button>
  );
}
