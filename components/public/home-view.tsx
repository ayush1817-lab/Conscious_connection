import Image from "next/image";
import Link from "next/link";
import { ConnectionLoops } from "@/components/public/brand-mark";
import { BackgroundWaves } from "@/components/public/background-waves";
import { Doodle, Ribbon } from "@/components/public/doodles";
import { PhotoPlaceholder, SlotPhoto } from "@/components/public/image-slot";
import { Illustration } from "@/components/public/illustrations";
import { PhotoGrid } from "@/components/public/photo-grid";
import { Eyebrow, SectionHeading } from "@/components/public/section-heading";
import { buttonClass } from "@/components/ui/button";
import { RichText } from "@/lib/content/rich-text";
import { linesOf, photosOf, type SectionValues } from "@/lib/content/sections";
import { publicImageUrl } from "@/lib/storage";

// The homepage's admin-editable parts, shared by the public homepage and the
// admin preview so the preview always looks exactly like the website.
// The lists that fill themselves (events, stories...) are passed in as children.

type Sections = Record<string, SectionValues>;

const WHERE = "Add it in Admin › Website content › Homepage";

// Puts a soft highlighter mark behind "LGBTQ+" in the headline.
function Headline({ text }: { text: string }) {
  const parts = text.split(/(LGBTQ\+)/);
  return parts.map((part, i) => (part === "LGBTQ+" ? <mark key={i} className="hero-mark">{part}</mark> : part));
}

export function HomeHero({ s }: { s: Sections }) {
  const { hero, hero_buttons: buttons } = s;
  const sizes = "(min-width: 1536px) 560px, (min-width: 768px) 36vw, 100vw";
  return (
    <section className="home-hero bg-hero">
      <BackgroundWaves className="hero-waves" />
      <div className="home-hero-inner mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
        <div className="home-hero-copy">
          <Eyebrow>{s.hero_eyebrow.heading}</Eyebrow>
          <h1 className="home-hero-title font-heading text-4xl leading-tight font-semibold md:text-5xl">
            <Headline text={hero.heading} />
          </h1>
          {hero.body ? <RichText text={hero.body} className="mt-4 text-lg" /> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/events" className={buttonClass("primary")}>
              {buttons.heading}
            </Link>
            <Link href="/stories" className={buttonClass("secondary")}>
              {buttons.body}
            </Link>
          </div>
          <ConnectionLoops />
        </div>
        <div className="home-hero-media">
          <div className="home-hero-photo relative overflow-hidden bg-band">
            {hero.image_path ? (
              <Image src={publicImageUrl("content", hero.image_path)} alt={hero.image_alt} fill preload sizes={sizes} className="object-cover" />
            ) : (
              <Image src="/images/community-gathering.webp" alt="" fill preload sizes={sizes} className="object-cover" />
            )}
          </div>
          <SlotPhoto section={s.hero_photo_2} slot="hero-circle" className="home-hero-circle" sizes="200px" />
          <SlotPhoto section={s.hero_photo_3} slot="hero-pill" className="home-hero-pill" sizes="180px" />
          <div className="hero-sticker" aria-hidden>
            <Doodle name="heart" tone="primary" className="hero-sticker-heart" />
            {s.hero_sticker.heading}
          </div>
          <Doodle name="sparkle" tone="primary" className="hero-doodle hero-doodle-1" />
          <Doodle name="sparkle" tone="orchid" className="hero-doodle hero-doodle-2" />
          <Doodle name="dots" tone="orchid" className="hero-doodle hero-doodle-3" />
          <Doodle name="bubble" tone="lilac" className="hero-doodle hero-doodle-4" />
        </div>
      </div>
    </section>
  );
}

export function HomeRibbon({ s }: { s: Sections }) {
  const items = linesOf(s.ribbon.body);
  return items.length ? <Ribbon items={items} /> : null;
}

export function HomeIntro({ s }: { s: Sections }) {
  const { intro } = s;
  return (
    <section aria-labelledby="intro-heading" className="home-intro mx-auto max-w-6xl px-4 py-10">
      {intro.heading ? (
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
          { art: "gathering" as const, card: s.value_1 },
          { art: "safe-space" as const, card: s.value_2 },
          { art: "community" as const, card: s.value_3 },
        ].map(({ art, card }, i) => (
          <li key={card.key} className={`home-value home-value-${i + 1}`}>
            <Illustration name={art} className="home-value-art" />
            <span className="home-value-title font-heading text-lg font-semibold">{card.heading}</span>
            <span className="home-value-text">{card.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PHOTO_IDEAS = ["A group shot from a meetup, everyone smiling", "Hands around mugs, books or a craft table", "Friends outdoors: the beach, a walk, a park"];

export function HomePhotos({ s }: { s: Sections }) {
  const photos = photosOf(s);
  return (
    <section aria-labelledby="photos-heading" className="home-section mx-auto max-w-6xl px-4 py-8">
      <SectionHeading id="photos-heading" eyebrow={s.photos_heading.body} title={s.photos_heading.heading} link={{ href: "/gallery", label: "See the gallery" }} />
      {photos.length ? (
        <PhotoGrid photos={photos} variant="polaroid" />
      ) : (
        <ul className="polaroids grid gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li key={n} className="polaroid">
              <PhotoPlaceholder
                label={`Event photo ${n}`}
                suggestion={PHOTO_IDEAS[n - 1]}
                size="1200 × 900 px, landscape"
                where={`${WHERE} › Event photo ${n}`}
                className="polaroid-photo"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HomeEvents({ s, children }: { s: Sections; children: React.ReactNode }) {
  return (
    <section aria-labelledby="events-heading" className="home-section home-events mx-auto max-w-6xl px-4 py-8">
      <SectionHeading id="events-heading" eyebrow={s.events_heading.body} title={s.events_heading.heading} link={{ href: "/events", label: "View all events" }} />
      {children}
    </section>
  );
}

export function HomeHost({ s }: { s: Sections }) {
  const { host_cta: cta } = s;
  return (
    <section aria-labelledby="host-heading" className="home-section mx-auto max-w-6xl px-4 py-8">
      <div className="home-host-panel rounded-card">
        <ConnectionLoops />
        <Doodle name="sparkle" tone="lilac" className="host-doodle host-doodle-1" />
        <Doodle name="heart" tone="orchid" className="host-doodle host-doodle-2" />
        <div className="home-host-copy">
          <Eyebrow className="eyebrow-on-dark">{s.host_eyebrow.heading}</Eyebrow>
          <h2 id="host-heading" className="font-heading text-2xl font-semibold md:text-3xl">
            {cta.heading}
          </h2>
          {cta.body ? <RichText text={cta.body} className="mt-2" /> : null}
          <Link href="/submit-event" className={buttonClass("secondary", "mt-5 shrink-0")}>
            {s.host_button.heading}
          </Link>
        </div>
        <div className="home-host-art">
          <SlotPhoto section={s.host_photo} slot="host-photo" className="home-host-photo" sizes="280px" where={`${WHERE} › Invitation to host`} />
          <Illustration name="host" className="home-host-illo" />
        </div>
      </div>
    </section>
  );
}

export function HomeStories({ s, children }: { s: Sections; children: React.ReactNode }) {
  return (
    <section aria-labelledby="stories-heading" className="home-section home-stories mx-auto max-w-6xl px-4 py-8">
      <Doodle name="flower" tone="orchid" className="stories-doodle" />
      <SectionHeading id="stories-heading" eyebrow={s.stories_heading.body} title={s.stories_heading.heading} link={{ href: "/stories", label: "View all stories and poems" }} />
      {children}
    </section>
  );
}

export function HomePodcast({ s, children }: { s: Sections; children: React.ReactNode }) {
  return (
    <section aria-labelledby="podcast-heading" className="home-section mx-auto max-w-6xl px-4 py-8">
      <div className="home-podcast rounded-card">
        <Doodle name="wave" tone="lilac" className="podcast-doodle" />
        <div className="home-podcast-head">
          <Eyebrow className="eyebrow-on-dark">{s.podcast_heading.body}</Eyebrow>
          <h2 id="podcast-heading" className="font-heading text-2xl font-semibold md:text-3xl">
            {s.podcast_heading.heading}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export function HomeGallery({ s, children }: { s: Sections; children: React.ReactNode }) {
  return (
    <section aria-labelledby="gallery-heading" className="home-section mx-auto max-w-6xl px-4 py-8">
      <SectionHeading id="gallery-heading" eyebrow={s.gallery_heading.body} title={s.gallery_heading.heading} link={{ href: "/gallery", label: "View all" }} />
      {children}
    </section>
  );
}
