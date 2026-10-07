import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailServiceFromEnv, sendAndLog } from "./service";
import type { RenderedEmail } from "./templates";

export * from "./templates";

// Sends an email with the configured provider (console, or Resend when
// RESEND_API_KEY is set) and logs it to email_log with the service role, so
// future host-side actions without an admin session can log too.
export function sendEmail(to: string, email: RenderedEmail) {
  return sendAndLog(createAdminClient(), emailServiceFromEnv(), to, email);
}
