"use client";

import { useActionState, useRef } from "react";
import type { ContactState } from "@/app/(public)/host/[token]/actions";
import { FormAlert, TextAreaField } from "./forms/fields";
import { useFocusFirstError } from "./forms/use-focus-first-error";

export function ContactRequestForm({ action }: { action: (prev: ContactState, formData: FormData) => Promise<ContactState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <TextAreaField
        id="reason"
        label="Why do you need their contact details?"
        hint="For example, the meeting point has moved. Karina decides whether to share them."
        required
        maxLength={500}
        rows={3}
        error={state.reasonError}
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-tap rounded-control bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Sending…" : "Request contact details"}
      </button>
    </form>
  );
}
