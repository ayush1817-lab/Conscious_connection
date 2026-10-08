"use client";

import { useActionState, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button, buttonClass } from "@/components/ui/button";

export type ConfirmAction = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

// Confirmation dialog for actions that can't be undone (cancel an event,
// regenerate a host link, share contact details).
export function ConfirmDialog({
  trigger,
  title,
  children,
  confirmLabel,
  action,
  variant = "secondary",
  confirmVariant = "primary",
  cancelLabel = "Go back",
}: {
  trigger: string;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  action: ConfirmAction;
  variant?: "primary" | "secondary" | "danger";
  confirmVariant?: "primary" | "destructive";
  cancelLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(action, {});
  const id = useId();

  return (
    <>
      <Button variant={variant} className="w-full sm:w-auto" onClick={() => dialogRef.current?.showModal()}>
        {trigger}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-card border border-border bg-surface p-0 text-text backdrop:bg-text/40"
      >
        <form action={formAction} className="space-y-4 p-5">
          <input type="hidden" name="confirmed" value="yes" />
          <h2 id={`${id}-title`} className="text-xl font-semibold">
            {title}
          </h2>
          <div id={`${id}-body`} className="space-y-2">
            {children}
          </div>
          {state.error ? (
            <p role="alert" className="font-medium text-danger">
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              className={buttonClass("secondary", "w-full sm:w-auto")}
            >
              {cancelLabel}
            </button>
            <ConfirmButton label={confirmLabel} variant={confirmVariant} />
          </div>
        </form>
      </dialog>
    </>
  );
}

function ConfirmButton({ label, variant }: { label: string; variant: "primary" | "destructive" }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className="w-full sm:w-auto"
    >
      {pending ? "Working…" : label}
    </Button>
  );
}
