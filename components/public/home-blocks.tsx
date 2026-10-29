import Image from "next/image";
import Link from "next/link";
import { EventCard, HostInviteCard } from "@/components/public/event-card";
import { PodcastPlayer } from "@/components/public/podcast-player";
import { StoryCard, StoryRow } from "@/components/public/story-card";
import { placesBadge } from "@/lib/public/events";
import type { HomeData } from "@/lib/public/home";
import { publicImageUrl } from "@/lib/storage";

// The homepage lists that fill themselves (events, stories, podcast, gallery).
// Shared by the public homepage and the admin preview.

export function UpcomingEventsList({ events, places }: Pick<HomeData, "events" | "places">) {
  if (!events.length) {
    return (
      <p className="rounded-card border border-border bg-surface p-6 text-muted">
        No events are coming up just yet.{" "}
        <Link href="/submit-event" className="font-medium text-primary underline underline-offset-4">
          Want to host the first one?
        </Link>
      </p>
    );
  }
  return (
    <ul className="events-grid home-events-grid grid gap-6">
      {events.map((event) => {
        const badge = placesBadge(places.get(event.id));
        return (
          <li key={event.id}>
            <EventCard event={event} badge={badge?.label} full={badge?.full} />
          </li>
        );
      })}
      {/* With fewer than three events, an invitation to host fills the row. */}
      {events.length < 3 ? (
        <li className={events.length === 1 ? "events-grid-invite-wide" : undefined}>
          <HostInviteCard />
        </li>
      ) : null}
    </ul>
  );
}

// One featured card and a short list, so the section stays short.
export function LatestStories({ stories }: Pick<HomeData, "stories">) {
  if (!stories.length) return null;
  return (
    <div className="home-stories-grid">
      <StoryCard story={stories[0]} featured />
      {stories.length > 1 ? (
        <ul className="flex flex-col gap-3">
          {stories.slice(1).map((story, i) => (
            <li key={story.id}>
              <StoryRow story={story} tone={i + 1} />
            </li>
          ))}
          <li className="home-stories-share">
            <p className="font-medium">Got a story or poem?</p>
            <Link href="/stories/share" className="font-medium text-primary underline underline-offset-4">
              Share yours
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export function LatestPodcast({ podcast, media }: Pick<HomeData, "podcast" | "media">) {
  if (!podcast || !media) return null;
  return (
    <div className="home-podcast-panel grid items-center gap-6">
      <PodcastPlayer media={media} title={podcast.title} />
      <div>
        <h3 className="font-heading text-xl font-semibold">{podcast.title}</h3>
        {podcast.description ? <p className="mt-2">{podcast.description}</p> : null}
        <Link href="/podcasts" className="mt-4 inline-flex min-h-tap items-center gap-1 font-medium underline underline-offset-4">
          All episodes
        </Link>
      </div>
    </div>
  );
}

export function GalleryStrip({ gallery }: Pick<HomeData, "gallery">) {
  if (!gallery.length) return null;
  return (
    <ul className="gallery-strip grid grid-cols-3 gap-3 md:grid-cols-6">
      {gallery.map((img) => (
        <li key={img.id} className="gallery-strip-item relative aspect-square overflow-hidden bg-band">
          <Image src={publicImageUrl("gallery", img.image_path)} alt={img.caption ?? ""} fill sizes="(min-width: 768px) 180px, 33vw" className="object-cover" />
        </li>
      ))}
    </ul>
  );
}
