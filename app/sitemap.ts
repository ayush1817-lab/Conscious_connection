import type { MetadataRoute } from "next";
import { getStories } from "@/lib/public/content";
import { getUpcomingEvents } from "@/lib/public/events";

export const dynamic = "force-dynamic";

// Public pages, live upcoming events and published stories.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const [events, stories] = await Promise.all([getUpcomingEvents(500), getStories()]);
  return [
    ...["", "/events", "/stories", "/podcasts", "/gallery", "/about", "/submit-event", "/privacy"].map((path) => ({ url: `${site}${path}` })),
    ...events.map((e) => ({ url: `${site}/events/${e.id}` })),
    ...stories.map((s) => ({ url: `${site}/stories/${s.slug}`, lastModified: s.published_at ?? undefined })),
  ];
}
