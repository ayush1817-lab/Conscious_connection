import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { RenderedEmail } from "./templates";

export type EmailProvider = Database["public"]["Enums"]["email_provider"];

export type SendResult = { ok: true } | { ok: false; error: string };

export interface EmailService {
  readonly provider: EmailProvider;
  send(to: string, email: RenderedEmail): Promise<SendResult>;
}

type Config = { from: string; replyTo?: string };

// Default: prints the email to the server console. Nothing leaves the server.
export class ConsoleEmailService implements EmailService {
  readonly provider = "console" as const;

  async send(to: string, email: RenderedEmail): Promise<SendResult> {
    console.log(`\n[email ${email.template}] to ${to}: ${email.subject}\n${email.text}`);
    return { ok: true };
  }
}

// Sends through Resend (https://resend.com). Used only when RESEND_API_KEY is set.
export class ResendEmailService implements EmailService {
  readonly provider = "resend" as const;

  constructor(
    private apiKey: string,
    private config: Config,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async send(to: string, email: RenderedEmail): Promise<SendResult> {
    try {
      const res = await this.fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.config.from,
          to: [to],
          subject: email.subject,
          text: email.text,
          html: email.html,
          ...(this.config.replyTo ? { reply_to: this.config.replyTo } : {}),
        }),
      });
      if (res.ok) return { ok: true };
      return { ok: false, error: `Resend returned ${res.status}: ${(await res.text()).slice(0, 500)}` };
    } catch (error) {
      return { ok: false, error: `Could not reach Resend: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

export function emailServiceFromEnv(env: Record<string, string | undefined> = process.env): EmailService {
  const config: Config = {
    from: env.EMAIL_FROM || "Conscious Connections <no-reply@consciousconnections.ie>",
    replyTo: env.EMAIL_REPLY_TO || undefined,
  };
  return env.RESEND_API_KEY ? new ResendEmailService(env.RESEND_API_KEY, config) : new ConsoleEmailService();
}

// Sends an email and records it in email_log, whether it was sent or failed.
// Never throws: a failed email must not undo the action that triggered it.
export async function sendAndLog(
  log: SupabaseClient<Database>,
  service: EmailService,
  to: string,
  email: RenderedEmail,
): Promise<SendResult> {
  const result = await service.send(to, email);
  if (!result.ok) console.error(`[email ${email.template}] to ${to} failed: ${result.error}`);

  const { error } = await log.from("email_log").insert({
    to_email: to,
    template: email.template,
    subject: email.subject,
    body: email.text,
    provider: service.provider,
    sent_at: result.ok ? new Date().toISOString() : null,
    error: result.ok ? null : result.error,
  });
  if (error) console.error("Could not write email_log", error);
  return result;
}
