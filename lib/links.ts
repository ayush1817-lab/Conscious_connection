// Links that go out in emails.
//
// SITE_URL should be set to the real address (e.g. https://consciousconnections.ie).
// If it's missing on Vercel we fall back to the deployment's own address rather
// than failing, because a missing setting used to throw after the event or
// registration was already saved, so the visitor saw nothing and no email went out.
export function siteUrl(env: Record<string, string | undefined> = process.env) {
  const configured = env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  if (vercel) {
    console.error("[config] SITE_URL is not set; using the Vercel address for links in emails. Set SITE_URL in Vercel.");
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
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

export function publicStoryUrl(slug: string) {
  return `${siteUrl()}/stories/${slug}`;
}

export function adminGalleryUrl() {
  return `${siteUrl()}/admin/content/gallery`;
}

export function adminStorySubmissionUrl(id: string) {
  return `${siteUrl()}/admin/content/stories/submissions/${id}`;
}
