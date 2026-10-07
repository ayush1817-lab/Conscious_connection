"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { setNewPassword, type FormState } from "../actions";

export function ResetForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setNewPassword, {});
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <TextField
        label="New password"
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        required
      />
      <TextField label="Type it again" id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
