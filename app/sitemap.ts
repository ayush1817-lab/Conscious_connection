import type { MetadataRoute } from "next";
import { getStories } from "@/lib/public/content";
import { getUpcomingEvents } from "@/lib/public/events";
import { siteUrl } from "@/lib/links";

export const dynamic = "force-dynamic";

// Public pages, live upcoming events and published stories.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteUrl();
  const [events, stories] = await Promise.all([getUpcomingEvents(500), getStories()]);
  return [
    ...["", "/events", "/stories", "/podcasts", "/gallery", "/about", "/submit-event", "/stories/share", "/guidelines", "/privacy"].map((path) => ({ url: `${site}${path}` })),
    ...events.map((e) => ({ url: `${site}/events/${e.id}` })),
    ...stories.map((s) => ({ url: `${site}/stories/${s.slug}`, lastModified: s.published_at ?? undefined })),
  ];
}
