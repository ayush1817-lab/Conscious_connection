import Image from "next/image";
import Link from "next/link";
import { ConnectionLoops } from "@/components/public/brand-mark";
import { Doodle, Ribbon } from "@/components/public/doodles";
import { BrandPhoto, PhotoPlaceholder } from "@/components/public/image-slot";
import { Illustration } from "@/components/public/illustrations";
import { BackgroundWaves } from "@/components/public/background-waves";
import { EventCard } from "@/components/public/event-card";
import { PhotoGrid } from "@/components/public/photo-grid";
import { Eyebrow, SectionHeading } from "@/components/public/section-heading";
import { StoryCard, StoryRow } from "@/components/public/story-card";
import { PodcastPlayer } from "@/components/public/podcast-player";
import { buttonClass } from "@/components/ui/button";
import { RichText } from "@/lib/content/rich-text";
import { podcastMedia } from "@/lib/content/podcast-media";
import { HERO_HEADING, STORIES_TITLE } from "@/lib/content/sections";
import { getGallery, getPodcasts, getSections, getStories, photosOf } from "@/lib/public/content";
import { getPlacesLeft, getUpcomingEvents, placesBadge } from "@/lib/public/events";
import { publicImageUrl } from "@/lib/storage";

// Kinds of gatherings shown in the moving ribbon under the hero.
const RIBBON = ["Coffee mornings", "Sea swims", "Book clubs", "Hill walks", "Poetry nights", "Board games", "Craft circles", "Picnics"];

// Puts a soft highlighter mark behind "LGBTQ+" in the (admin-editable) headline.
function Headline({ text }: { text: string }) {
  const parts = text.split(/(LGBTQ\+)/);
  return parts.map((part, i) => (part === "LGBTQ+" ? <mark key={i} className="hero-mark">{part}</mark> : part));
}

// P1 Homepage: the admin's sections, the next 3 events, latest stories, latest podcast, gallery strip.
export default async function HomePage() {
  const [sections, events, stories, podcasts, gallery] = await Promise.all([
    getSections("home"),
    getUpcomingEvents(3),
    getStories(3),
    getPodcasts(1),
    getGallery(6),
  ]);
  const { hero, intro, host_cta: hostCta } = sections;
  const photos = photosOf(sections);
  const places = await getPlacesLeft(events.filter((e) => e.capacity).map((e) => e.id));
  const podcast = podcasts[0];
  const media = podcast ? podcastMedia(podcast) : null;

  return (
    <>
      {/* Hero */}
      <section className="home-hero bg-hero">
        <BackgroundWaves className="hero-waves" />
        <div className="home-hero-inner mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
          <div className="home-hero-copy">
            <Eyebrow>Events · Stories · Community</Eyebrow>
            <h1 className="home-hero-title font-heading text-4xl leading-tight font-semibold md:text-5xl">
              <Headline text={hero?.heading || HERO_HEADING} />
            </h1>
            {hero?.body ? <RichText text={hero.body} className="mt-4 text-lg" /> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/events" className={buttonClass("primary")}>
                Find events
              </Link>
              <Link href="/stories" className={buttonClass("secondary")}>
                Stories &amp; poetry
              </Link>
            </div>
            <ConnectionLoops />
          </div>
          <div className="home-hero-media">
            <div className="home-hero-photo relative overflow-hidden bg-band">
              {hero?.image_path ? (
                <Image src={publicImageUrl("content", hero.image_path)} alt={hero.image_alt} fill preload sizes="(min-width: 1536px) 560px, (min-width: 768px) 36vw, 100vw" className="object-cover" />
              ) : (
                <Image src="/images/community-gathering.webp" alt="" fill preload sizes="(min-width: 1536px) 560px, (min-width: 768px) 36vw, 100vw" className="object-cover" />
              )}
            </div>
            <BrandPhoto slot="hero-circle" className="home-hero-circle" sizes="200px" />
            <BrandPhoto slot="hero-pill" className="home-hero-pill" sizes="180px" />
            <div className="hero-sticker" aria-hidden>
              <Doodle name="heart" tone="primary" className="hero-sticker-heart" />
              You belong here
            </div>
            <Doodle name="sparkle" tone="primary" className="hero-doodle hero-doodle-1" />
            <Doodle name="sparkle" tone="orchid" className="hero-doodle hero-doodle-2" />
            <Doodle name="dots" tone="orchid" className="hero-doodle hero-doodle-3" />
            <Doodle name="bubble" tone="lilac" className="hero-doodle hero-doodle-4" />
          </div>
        </div>
      </section>

      <Ribbon items={RIBBON} />

      {/* Introduction + what we're about */}
      <section aria-labelledby="intro-heading" className="home-intro mx-auto max-w-6xl px-4 py-10">
        {intro?.heading ? (
          <div className="home-intro-copy mx-auto mb-8 max-w-2xl text-center">
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
        <ul className="home-values grid gap-6 sm:grid-cols-3">
          {[
            { art: "gathering" as const, card: sections.value_1 },
            { art: "safe-space" as const, card: sections.value_2 },
            { art: "community" as const, card: sections.value_3 },
          ].map(({ art, card: { key, heading: title, body: text } }, i) => (
            <li key={key} className={`home-value home-value-${i + 1}`}>
              <Illustration name={art} className="home-value-art" />
              <span className="home-value-title font-heading text-lg font-semibold">{title}</span>
              <span className="home-value-text">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Event photos (Website content > Homepage) */}
      <section aria-labelledby="photos-heading" className="home-section mx-auto max-w-6xl px-4 py-8">
        <SectionHeading id="photos-heading" eyebrow="Snapshots" title="Moments from our events" link={{ href: "/gallery", label: "See the gallery" }} />
        {photos.length ? (
          <PhotoGrid photos={photos} variant="polaroid" />
        ) : (
          <ul className="polaroids grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="polaroid">
                <PhotoPlaceholder
                  label={`Event photo ${n}`}
                  suggestion={["A group shot from a meetup, everyone smiling", "Hands around mugs, books or a craft table", "Friends outdoors: the beach, a walk, a park"][n - 1]}
                  size="1200 × 900 px, landscape"
                  where={`Add it in Admin › Website content › Homepage › Event photo ${n}`}
                  className="polaroid-photo"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming events */}
      <section aria-labelledby="events-heading" className="home-section home-events mx-auto max-w-6xl px-4 py-8">
        <SectionHeading id="events-heading" eyebrow="What's on" title="Upcoming events" link={{ href: "/events", label: "View all events" }} />
        {events.length ? (
          <ul className="events-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Invitation to host */}
      <section aria-labelledby="host-heading" className="home-section mx-auto max-w-6xl px-4 py-8">
        <div className="home-host-panel rounded-card">
          <ConnectionLoops />
          <Doodle name="sparkle" tone="lilac" className="host-doodle host-doodle-1" />
          <Doodle name="heart" tone="orchid" className="host-doodle host-doodle-2" />
          <div className="home-host-copy">
            <Eyebrow className="eyebrow-on-dark">Bring people together</Eyebrow>
            <h2 id="host-heading" className="font-heading text-2xl font-semibold md:text-3xl">
              {hostCta?.heading || "Want to host an event?"}
            </h2>
            {hostCta?.body ? <RichText text={hostCta.body} className="mt-2" /> : (
              <p className="mt-2">A coffee, a walk, a book swap. Small is perfect. We&apos;ll help you share it.</p>
            )}
            <Link href="/submit-event" className={buttonClass("secondary", "mt-5 shrink-0")}>
              Host an event
            </Link>
          </div>
          <div className="home-host-art">
            <BrandPhoto slot="host-photo" className="home-host-photo" sizes="280px" />
            <Illustration name="host" className="home-host-illo" />
          </div>
        </div>
      </section>

      {/* Stories: one featured card and a short list, so the section stays short. */}
      {stories.length ? (
        <section aria-labelledby="stories-heading" className="home-section home-stories mx-auto max-w-6xl px-4 py-8">
          <Doodle name="flower" tone="orchid" className="stories-doodle" />
          <SectionHeading id="stories-heading" eyebrow="From the community" title={STORIES_TITLE} link={{ href: "/stories", label: "View all stories and poems" }} />
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
        </section>
      ) : null}

      {/* Latest podcast */}
      {podcast && media ? (
        <section aria-labelledby="podcast-heading" className="home-section mx-auto max-w-6xl px-4 py-8">
          <div className="home-podcast rounded-card">
            <Doodle name="wave" tone="lilac" className="podcast-doodle" />
            <div className="home-podcast-head">
              <Eyebrow className="eyebrow-on-dark">Listen in</Eyebrow>
              <h2 id="podcast-heading" className="font-heading text-2xl font-semibold md:text-3xl">Latest podcast</h2>
            </div>
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
          </div>
        </section>
      ) : null}

      {/* Gallery strip */}
      {gallery.length ? (
        <section aria-labelledby="gallery-heading" className="home-section mx-auto max-w-6xl px-4 py-8">
          <SectionHeading id="gallery-heading" eyebrow="Gallery" title="Our community, together" link={{ href: "/gallery", label: "View all" }} />
          <ul className="gallery-strip grid grid-cols-3 gap-3 md:grid-cols-6">
            {gallery.map((img) => (
              <li key={img.id} className="gallery-strip-item relative aspect-square overflow-hidden bg-band">
                <Image src={publicImageUrl("gallery", img.image_path)} alt={img.caption ?? ""} fill sizes="(min-width: 768px) 180px, 33vw" className="object-cover" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
