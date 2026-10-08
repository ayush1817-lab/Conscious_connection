import { requireEnv } from "@/lib/env";

// Links that go out in emails.
function siteUrl() {
  return requireEnv("SITE_URL").replace(/\/+$/, "");
}

export function publicEventUrl(eventId: string) {
  return `${siteUrl()}/events/${eventId}`;
}

export function hostLinkUrl(token: string) {
  return `${siteUrl()}/host/${token}`;
}

export function adminEventUrl(eventId: string) {
  return `${siteUrl()}/admin/events/${eventId}`;
}

export function adminAttentionUrl(itemId: string) {
  return `${siteUrl()}/admin/attention/${itemId}`;
}
