"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { sendTestEmail, type TestState } from "./actions";

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const [state, action] = useActionState<TestState, FormData>(sendTestEmail, {});
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex-1">
        <label htmlFor="test-to" className="mb-1 block font-medium">
          Send to
        </label>
        <input
          id="test-to"
          name="to"
          type="email"
          required
          defaultValue={defaultTo}
          className="min-h-tap w-full rounded-control border border-control-border bg-surface px-3"
        />
      </div>
      <SendButton />
      <p role="status" aria-live="polite" className="sm:basis-full">
        {state.sent ? <span className="font-medium text-success">Sent to {state.sent}. Check that inbox.</span> : null}
        {state.error ? <span className="font-medium text-danger">{state.error}</span> : null}
      </p>
    </form>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Sending…" : "Send test email"}
    </Button>
  );
}
