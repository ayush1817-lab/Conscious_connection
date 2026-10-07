"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { sendResetLink, type FormState } from "../actions";

export function ForgotForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendResetLink, {});

  if (state.done) {
    return (
      <div className="mt-6 space-y-4">
        <Alert tone="success">
          If there&apos;s an account for {state.email}, we&apos;ve emailed a link to choose a new password. Please check
          your inbox and your spam folder.
        </Alert>
        <Link href="/admin/login" className="inline-block py-2 text-primary underline underline-offset-4">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {state.error ? (
        <Alert>{state.error}</Alert>
      ) : expired ? (
        <Alert>That link has expired or was already used. Enter your email to get a new one.</Alert>
      ) : null}
      <p className="text-muted">Enter the email you log in with and we&apos;ll send you a link to choose a new password.</p>
      <TextField label="Email" id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <Link href="/admin/login" className="inline-block py-2 text-primary underline underline-offset-4">
        Back to login
      </Link>
    </form>
  );
}
