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

// Used when the site is deployed but RESEND_API_KEY is missing. Before this,
// a deployed site without the key quietly printed emails to the server log and
// recorded them as sent, so nobody noticed nothing was arriving.
export class MissingKeyEmailService implements EmailService {
  readonly provider = "console" as const;

  async send(to: string, email: RenderedEmail): Promise<SendResult> {
    console.log(`\n[email ${email.template}] NOT SENT to ${to}: ${email.subject}`);
    return { ok: false, error: "Not sent: RESEND_API_KEY is not set on this deployment." };
  }
}

export const DEFAULT_FROM = "Conscious Connections <no-reply@consciousconnections.ie>";

export type EmailConfig = {
  mode: "resend" | "console" | "missing_key";
  from: string;
  fromDomain: string | null;
  replyTo: string | null;
};

// Deployed (Vercel, or a production build) means real people expect real emails.
// EMAIL_PROVIDER=console opts out, e.g. for a staging copy.
export function emailConfig(env: Record<string, string | undefined> = process.env): EmailConfig {
  const from = env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  const fromDomain = /@([^>\s]+)>?\s*$/.exec(from)?.[1]?.toLowerCase() ?? null;
  const deployed = Boolean(env.VERCEL) || env.NODE_ENV === "production";
  const mode = env.RESEND_API_KEY
    ? "resend"
    : env.EMAIL_PROVIDER === "console" || !deployed
      ? "console"
      : "missing_key";
  return { mode, from, fromDomain, replyTo: env.EMAIL_REPLY_TO?.trim() || null };
}

export function emailServiceFromEnv(env: Record<string, string | undefined> = process.env): EmailService {
  const config = emailConfig(env);
  if (config.mode === "resend") {
    return new ResendEmailService(env.RESEND_API_KEY!, { from: config.from, replyTo: config.replyTo ?? undefined });
  }
  if (config.mode === "missing_key") return new MissingKeyEmailService();
  return new ConsoleEmailService();
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
  if (!result.ok) {
    console.error(JSON.stringify({ event: "email_failed", template: email.template, to, subject: email.subject, error: result.error }));
  }

  const { error } = await log.from("email_log").insert({
    to_email: to,
    template: email.template,
    subject: email.subject,
    body: email.text,
    provider: service.provider,
    sent_at: result.ok ? new Date().toISOString() : null,
    error: result.ok ? null : result.error,
  });
  if (error) console.error(JSON.stringify({ event: "email_log_failed", template: email.template, to, error: error.message }));
  return result;
}
