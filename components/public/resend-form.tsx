"use client";

import { useActionState, useRef } from "react";
import { resendHostLinks } from "@/app/(public)/host/resend/actions";
import { FormAlert, Honeypot, InputField } from "./forms/fields";
import { useFocusFirstError } from "./forms/use-focus-first-error";
import { MailIcon } from "./icons";

// H6 Resend my link.
export function ResendForm() {
  const [state, formAction, pending] = useActionState(resendHostLinks, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  if (state.done) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-card border-2 border-success bg-surface p-5 text-lg">
        <MailIcon className="mt-1 shrink-0 text-success" />
        <p>
          If there&apos;s an active event for this email, we&apos;ve sent the link. Please check your inbox and your spam folder.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="relative space-y-4">
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <InputField
        id="email"
        label="The email you used when you submitted your event"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        maxLength={254}
        defaultValue={state.email}
        error={state.emailError}
      />
      <Honeypot />
      <button
        type="submit"
        disabled={pending}
        className="min-h-tap w-full rounded-control bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending…" : "Send me my link"}
      </button>
    </form>
  );
}
