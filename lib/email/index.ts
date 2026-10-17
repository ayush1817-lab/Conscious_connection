import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailServiceFromEnv, sendAndLog, type SendResult } from "./service";
import type { RenderedEmail } from "./templates";

export * from "./templates";

// Sends an email with the configured provider (console, or Resend when
// RESEND_API_KEY is set) and logs it to email_log with the service role, so
// future host-side actions without an admin session can log too.
// Never throws: a failed email must not undo or hide the action that triggered it.
export async function sendEmail(to: string, email: RenderedEmail): Promise<SendResult> {
  try {
    return await sendAndLog(createAdminClient(), emailServiceFromEnv(), to, email);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: "email_failed", template: email.template, to, error: message }));
    return { ok: false, error: message };
  }
}

// Runs the emails that follow an action (building links, rendering, sending)
// so that any error is logged instead of breaking the page the visitor sees.
export async function sendQuietly(label: string, work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    console.error(JSON.stringify({ event: "email_step_failed", label, error: error instanceof Error ? error.message : String(error) }));
  }
}
