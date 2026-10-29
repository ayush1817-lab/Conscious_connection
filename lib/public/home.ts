import "server-only";
import { podcastMedia } from "@/lib/content/podcast-media";
import { getGallery, getPodcasts, getSections, getStories } from "@/lib/public/content";
import { getPlacesLeft, getUpcomingEvents } from "@/lib/public/events";

// Everything the homepage shows: the admin's sections and the lists that fill
// themselves. Also used by the admin preview.
export async function getHomeData() {
  const [sections, events, stories, podcasts, gallery] = await Promise.all([
    getSections("home"),
    getUpcomingEvents(3),
    getStories(3),
    getPodcasts(1),
    getGallery(6),
  ]);
  const places = await getPlacesLeft(events.filter((e) => e.capacity).map((e) => e.id));
  const podcast = podcasts[0] ?? null;
  return { sections, events, places, stories, podcast, media: podcast ? podcastMedia(podcast) : null, gallery };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
