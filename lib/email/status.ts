import "server-only";
import { adminNotifyEmails } from "./admin-recipients";
import { emailConfig, type EmailConfig } from "./service";

export type DomainStatus =
  | { state: "verified" }
  | { state: "not_verified"; detail: string }
  | { state: "not_found" }
  | { state: "unknown"; detail: string };

// Asks Resend whether the sending domain (from EMAIL_FROM) is verified.
// A "sending access only" key can't list domains; that's reported as unknown.
export async function checkSendingDomain(config: EmailConfig, apiKey = process.env.RESEND_API_KEY): Promise<DomainStatus> {
  if (config.mode !== "resend" || !apiKey) return { state: "unknown", detail: "Resend isn't set up yet." };
  if (!config.fromDomain) return { state: "unknown", detail: "EMAIL_FROM doesn't contain an email address." };
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401 || res.status === 403) {
      const text = await res.text();
      if (/restricted/i.test(text)) return { state: "unknown", detail: "This API key can only send, so it can't check domains. Check the domain in the Resend dashboard." };
      return { state: "unknown", detail: "Resend rejected the API key. Check RESEND_API_KEY in Vercel." };
    }
    if (!res.ok) return { state: "unknown", detail: `Resend returned ${res.status}.` };
    const body = (await res.json()) as { data?: { name: string; status: string }[] };
    const domain = body.data?.find((d) => d.name.toLowerCase() === config.fromDomain);
    if (!domain) return { state: "not_found" };
    if (domain.status === "verified") return { state: "verified" };
    return { state: "not_verified", detail: domain.status };
  } catch (error) {
    return { state: "unknown", detail: `Couldn't reach Resend: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function emailStatus() {
  const config = emailConfig();
  const [domain, adminRecipients] = await Promise.all([checkSendingDomain(config), adminNotifyEmails().catch(() => [] as string[])]);
  return { config, domain, adminRecipients, siteUrlSet: Boolean(process.env.SITE_URL) };
}
