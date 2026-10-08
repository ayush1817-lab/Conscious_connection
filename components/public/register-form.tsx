"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import type { RegisterState } from "@/app/(public)/events/[id]/actions";
import { ConsentField, FormAlert, Honeypot, InputField } from "./forms/fields";
import { useFocusFirstError } from "./forms/use-focus-first-error";

// P4 Registration form.
export function RegisterForm({ action }: { action: (prev: RegisterState, formData: FormData) => Promise<RegisterState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const v = state.values;

  return (
    <form ref={formRef} action={formAction} noValidate className="relative space-y-4">
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <InputField
        id="name"
        label="Your name"
        hint="A first name or nickname is fine."
        required
        maxLength={60}
        autoComplete="given-name"
        defaultValue={v?.name}
        error={state.fieldErrors?.name}
      />
      <InputField
        id="email"
        label="Email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        inputMode="email"
        defaultValue={v?.email}
        error={state.fieldErrors?.email}
      />
      <p className="text-sm text-muted">
        We only use your email to send you the event details. The host sees your name only. Your details are deleted 7 days
        after the event.{" "}
        <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
          Privacy
        </Link>
      </p>
      <ConsentField id="consent" defaultChecked={v?.consent} error={state.fieldErrors?.consent}>
        I agree to Conscious Connections using my name and email for this event.
      </ConsentField>
      <Honeypot />
      <button
        type="submit"
        disabled={pending}
        className="min-h-tap w-full rounded-control bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Registering…" : "Register for this event"}
      </button>
    </form>
  );
}
