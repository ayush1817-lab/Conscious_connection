import Image from "next/image";
import Link from "next/link";
import { EventCard } from "@/components/public/event-card";
import { CalendarIcon, HeartIcon, PeopleIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";
import { StoryCard } from "@/components/public/story-card";
import { YouTubeEmbed } from "@/components/public/youtube-embed";
import { buttonClass } from "@/components/ui/button";
import { RichText } from "@/lib/content/rich-text";
import { youtubeVideoId } from "@/lib/content/youtube";
import { getGallery, getPodcasts, getSections, getStories } from "@/lib/public/content";
import { getPlacesLeft, getUpcomingEvents, placesBadge } from "@/lib/public/events";
import { publicImageUrl } from "@/lib/storage";

// P1 Homepage: Karina's sections, the next 3 events, latest stories, latest podcast, gallery strip.
export default async function HomePage() {
  const [sections, events, stories, podcasts, gallery] = await Promise.all([
    getSections("home"),
    getUpcomingEvents(3),
    getStories(3),
    getPodcasts(1),
    getGallery(6),
  ]);
  const { hero, intro, host_cta: hostCta } = sections;
  const places = await getPlacesLeft(events.filter((e) => e.capacity).map((e) => e.id));
  const podcast = podcasts[0];
  const videoId = podcast ? youtubeVideoId(podcast.youtube_url) : null;

  return (
    <>
      {/* Hero */}
      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
          <div>
            <h1 className="font-heading text-4xl leading-tight font-semibold md:text-5xl">
              {hero?.heading || "A community for women and non-binary people across rural Ireland."}
            </h1>
            {hero?.body ? <RichText text={hero.body} className="mt-4 text-lg" /> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/events" className={buttonClass("primary")}>
                Find events
              </Link>
              <Link href="/stories" className={buttonClass("secondary")}>
                Stories
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-band">
            {hero?.image_path ? (
              <Image src={publicImageUrl("content", hero.image_path)} alt="" fill preload sizes="(min-width: 768px) 560px, 100vw" className="object-cover" />
            ) : (
              <div aria-hidden className="h-full w-full bg-gradient-to-br from-poster-from to-poster-to" />
            )}
          </div>
        </div>
      </section>

      {/* Introduction + what we're about */}
      <section aria-labelledby="intro-heading" className="mx-auto max-w-6xl px-4 py-10">
        {intro?.heading ? (
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 id="intro-heading" className="font-heading text-2xl font-semibold md:text-3xl">
              {intro.heading}
            </h2>
            {intro.body ? <RichText text={intro.body} className="mt-3 text-lg text-muted" /> : null}
          </div>
        ) : (
          <h2 id="intro-heading" className="sr-only">
            What we&apos;re about
          </h2>
        )}
        <ul className="grid gap-6 text-center sm:grid-cols-3">
          {[
            { icon: CalendarIcon, title: "Local events", text: "Find gatherings near you across rural counties." },
            { icon: PeopleIcon, title: "A safe and inclusive space", text: "For LGBTQ+ women and non-binary people." },
            { icon: HeartIcon, title: "Community led", text: "Created by and for our community." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col items-center gap-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-hero text-primary">
                <Icon size={28} />
              </span>
              <span className="font-heading text-lg font-semibold">{title}</span>
              <span className="text-muted">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Upcoming events */}
      <section aria-labelledby="events-heading" className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeading id="events-heading" title="Upcoming events" link={{ href: "/events", label: "View all events" }} />
        {events.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const badge = placesBadge(places.get(event.id));
              return (
                <li key={event.id}>
                  <EventCard event={event} badge={badge?.label} full={badge?.full} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-card border border-border bg-surface p-6 text-muted">
            No events are coming up just yet.{" "}
            <Link href="/submit-event" className="font-medium text-primary underline underline-offset-4">
              Want to host the first one?
            </Link>
          </p>
        )}
      </section>

      {/* Stories */}
      {stories.length ? (
        <section aria-labelledby="stories-heading" className="mx-auto max-w-6xl px-4 py-8">
          <SectionHeading id="stories-heading" title="Stories from our community" link={{ href: "/stories", label: "View all stories" }} />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <li key={story.id}>
                <StoryCard story={story} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Latest podcast */}
      {podcast && videoId ? (
        <section aria-labelledby="podcast-heading" className="mx-auto max-w-6xl px-4 py-8">
          <SectionHeading id="podcast-heading" title="Latest podcast" link={{ href: "/podcasts", label: "All episodes" }} />
          <div className="grid items-center gap-6 rounded-card border border-border bg-surface p-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:p-6">
            <YouTubeEmbed videoId={videoId} title={podcast.title} />
            <div>
              <h3 className="font-heading text-xl font-semibold">{podcast.title}</h3>
              {podcast.description ? <p className="mt-2 text-muted">{podcast.description}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* Gallery strip */}
      {gallery.length ? (
        <section aria-labelledby="gallery-heading" className="mx-auto max-w-6xl px-4 py-8">
          <SectionHeading id="gallery-heading" title="Gallery" link={{ href: "/gallery", label: "View all" }} />
          <ul className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
            {gallery.map((img) => (
              <li key={img.id} className="relative aspect-square overflow-hidden rounded-control bg-band">
                <Image src={publicImageUrl("gallery", img.image_path)} alt={img.caption ?? ""} fill sizes="(min-width: 768px) 180px, 33vw" className="object-cover" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Invitation to host */}
      <section aria-labelledby="host-heading" className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 rounded-card bg-band p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-2xl">
            <h2 id="host-heading" className="font-heading text-2xl font-semibold">
              {hostCta?.heading || "Want to host an event?"}
            </h2>
            {hostCta?.body ? <RichText text={hostCta.body} className="mt-2 text-muted" /> : null}
          </div>
          <Link href="/submit-event" className={buttonClass("primary", "shrink-0")}>
            Host an event
          </Link>
        </div>
      </section>
    </>
  );
}
