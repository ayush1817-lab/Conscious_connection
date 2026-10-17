import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/admin";
import { emailStatus } from "@/lib/email/status";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { TestEmailForm } from "./test-email-form";

export const metadata: Metadata = { title: "Emails · Conscious Connections" };

const TEMPLATE_NAMES: Record<string, string> = {
  E1: "Event received (host)",
  E2: "Changes needed (host)",
  E3: "Event declined (host)",
  E4: "Event approved / new link (host)",
  E5: "New event request (admin)",
  E6: "Host edited event (admin)",
  E7: "Host cancelled or asked for contacts (admin)",
  E8: "Registration confirmed (attendee)",
  E9: "Event cancelled (attendee)",
  E10: "Contact details decision (host)",
  E11: "Event taken down (host)",
  E12: "Changes received (host)",
  S1: "Story received (writer)",
  S2: "New story to review (admin)",
  S3: "Story published (writer)",
  TEST: "Test email",
};

// Email health: is sending set up, is the domain verified, and what was sent recently.
export default async function EmailPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const [status, { data: recent }] = await Promise.all([
    emailStatus(),
    supabase.from("email_log").select("id, created_at, to_email, template, subject, sent_at, error").order("created_at", { ascending: false }).limit(40),
  ]);
  const { config, domain } = status;
  const failures = (recent ?? []).filter((e) => !e.sent_at).length;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex min-h-tap items-center text-primary underline-offset-4 hover:underline">
        ‹ Admin home
      </Link>
      <h1 className="text-3xl font-semibold">Emails</h1>

      <section aria-labelledby="setup-heading" className="space-y-3 rounded-card border border-border bg-surface p-5">
        <h2 id="setup-heading" className="text-xl font-semibold">
          Set-up
        </h2>
        <dl className="grid gap-3 sm:grid-cols-[14rem_1fr]">
          <dt className="text-muted">Sending</dt>
          <dd>
            {config.mode === "resend" ? (
              <Badge tone="success">Sending through Resend</Badge>
            ) : config.mode === "missing_key" ? (
              <span className="space-y-1">
                <Badge tone="danger">Not sending</Badge>
                <span className="block">
                  <code>RESEND_API_KEY</code> isn&apos;t set in Vercel, so no emails leave the site. Add it under Vercel &gt; Settings &gt;
                  Environment Variables, then redeploy.
                </span>
              </span>
            ) : (
              <span>
                <Badge tone="muted">Test mode</Badge> Emails are only printed to the server log (local development).
              </span>
            )}
          </dd>

          <dt className="text-muted">Sent from</dt>
          <dd>
            <code className="break-all">{config.from}</code>
            {!process.env.EMAIL_FROM ? <span className="block text-sm text-muted">Default address. Set EMAIL_FROM to choose your own.</span> : null}
          </dd>

          <dt className="text-muted">Sending domain</dt>
          <dd>
            {domain.state === "verified" ? (
              <Badge tone="success">{config.fromDomain} is verified</Badge>
            ) : domain.state === "not_verified" ? (
              <span>
                <Badge tone="danger">Not verified yet ({domain.detail})</Badge>
                <span className="block">Resend won&apos;t send from {config.fromDomain} until its DNS records are added. Open Resend &gt; Domains.</span>
              </span>
            ) : domain.state === "not_found" ? (
              <span>
                <Badge tone="danger">Not added to Resend</Badge>
                <span className="block">
                  Add <strong>{config.fromDomain}</strong> in Resend &gt; Domains and add the DNS records it shows, or change EMAIL_FROM to a domain
                  that is verified.
                </span>
              </span>
            ) : (
              <span className="text-muted">{domain.detail}</span>
            )}
          </dd>

          <dt className="text-muted">Replies go to</dt>
          <dd>{config.replyTo ?? <span className="text-muted">The sending address (set EMAIL_REPLY_TO to use an inbox you read)</span>}</dd>

          <dt className="text-muted">Admin notifications go to</dt>
          <dd>{status.adminRecipients.length ? status.adminRecipients.join(", ") : <span className="text-danger">Nobody. Set ADMIN_NOTIFY_EMAIL.</span>}</dd>

          <dt className="text-muted">Links in emails</dt>
          <dd>{status.siteUrlSet ? "Use SITE_URL" : <span className="text-danger">SITE_URL isn&apos;t set, so links use the Vercel address.</span>}</dd>
        </dl>
      </section>

      <section aria-labelledby="test-heading" className="space-y-3 rounded-card border border-border bg-surface p-5">
        <h2 id="test-heading" className="text-xl font-semibold">
          Send a test email
        </h2>
        <p className="text-muted">Check it arrives in the inbox, not in spam.</p>
        <TestEmailForm defaultTo={admin.email} />
      </section>

      <section aria-labelledby="recent-heading" className="space-y-3">
        <h2 id="recent-heading" className="text-xl font-semibold">
          Recent emails {failures ? <Badge tone="danger">{failures} not sent</Badge> : null}
        </h2>
        {recent?.length ? (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {recent.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{e.subject}</p>
                  <p className="text-sm text-muted">
                    {TEMPLATE_NAMES[e.template] ?? e.template} · to <span className="break-all">{e.to_email}</span> · {formatDateTime(e.created_at)}
                  </p>
                  {e.error ? <p className="mt-1 text-sm text-danger break-words">{e.error}</p> : null}
                </div>
                {e.sent_at ? <Badge tone="success">Sent</Badge> : <Badge tone="danger">Not sent</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-border bg-surface p-6 text-muted">No emails yet.</p>
        )}
        <p className="text-sm text-muted">Copies are kept for 30 days.</p>
      </section>
    </div>
  );
}
