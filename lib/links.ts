import { requireEnv } from "@/lib/env";

// Links that go out in emails. The public and host pages come in a later phase,
// so these may 404 until then.
function siteUrl() {
  return requireEnv("SITE_URL").replace(/\/+$/, "");
}

export function publicEventUrl(eventId: string) {
  return `${siteUrl()}/events/${eventId}`;
}

export function hostLinkUrl(token: string) {
  return `${siteUrl()}/host/${token}`;
}
