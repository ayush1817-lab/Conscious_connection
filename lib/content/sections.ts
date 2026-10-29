// The editable sections of each content page (site_sections rows, keyed by
// page + key). Public pages fall back to `defaults` when a row is missing or a
// field is left empty, so the site never shows a blank section.

// "pages" holds the title and introduction of the other public pages.
export type ContentPage = "home" | "about" | "pages" | "guidelines";

export type SectionDef = {
  key: string;
  // Name shown in the admin.
  title: string;
  // Short explanation shown under the title in the admin.
  hint?: string;
  heading: "required" | "optional" | "none";
  headingLabel?: string;
  body: boolean;
  bodyLabel?: string;
  // How the text is edited: "rich" (paragraphs, bold, italic; the default),
  // "line" (one short line) or "lines" (a list, one item per line).
  bodyKind?: "rich" | "line" | "lines";
  // Short help under a field in the admin.
  headingHint?: string;
  bodyHint?: string;
  image: boolean;
  imageLabel?: string;
  imageHint?: string;
  // Longer page text: sub-headings ("## "), bullet points ("* ") and links.
  blocks?: boolean;
  // Longest text allowed (default 3000 characters).
  maxBody?: number;
  defaults: { heading: string; body: string };
};

export const HERO_HEADING = "A community for LGBTQ+ women and non-binary people across the island of Ireland.";
export const STORIES_TITLE = "Stories and Poetry from our Community";

// Karina's About text (October 2026).
export const ABOUT_BODY = `## Who We Are

Conscious Connections is a vibrant community dedicated to LGBTQ+ women and non-binary people across the island of Ireland. We know that building meaningful connections can sometimes feel challenging, which is why we've created a welcoming, open space to bridge the gaps and build a true sense of belonging everywhere on the island.

## What We're About

* **Community-Led & Open Events:** This space belongs to everyone. Anyone in our community can host and upload their own gatherings, from coffee socials to local meetups, making it easy to connect with people close to home.
* **Shared Voices:** Built entirely by our community, this network thrives on shared stories, podcasts and member-led activities that reflect our collective experiences.
* **A Safe & Inclusive Space:** We are proudly and fiercely inclusive, providing a safe, affirming environment specifically for LGBTQ+ women and non-binary individuals.

## Join Us

Whether you want to attend a local gathering, host and submit your own event or share your story, there is a place for you here.

Contact us for more information: karina@kmurray.ie`;

const value = (n: number, heading: string, body: string): SectionDef => ({
  key: `value_${n}`,
  title: `What we're about: card ${n}`,
  hint: "One of the three short cards under the introduction. The icon stays the same.",
  heading: "required",
  headingLabel: "Card title",
  body: true,
  bodyLabel: "Card text (one short sentence)",
  image: false,
  defaults: { heading, body },
});

const intro = (key: string, page: string, heading: string, body: string): SectionDef => ({
  key,
  title: page,
  hint: `The title and short introduction at the top of the ${page} page.`,
  heading: "required",
  headingLabel: "Page title",
  body: true,
  bodyLabel: "Introduction",
  image: false,
  defaults: { heading, body },
});

const guideline = (key: string, heading: string): SectionDef => ({
  key,
  title: heading,
  hint: "Shown on the Community Guidelines page. Leave the text empty to show \"coming soon\". A line starting with ## is a sub-heading, lines starting with * are bullet points.",
  heading: "required",
  headingLabel: "Section title",
  body: true,
  bodyLabel: "Guidelines",
  image: false,
  blocks: true,
  maxBody: GUIDELINES_MAX,
  defaults: { heading, body: "" },
});

export const GUIDELINES_MAX = 20000;

const photo = (n: number, where: string): SectionDef => ({
  key: `photo_${n}`,
  title: `Event photo ${n}`,
  hint: `Shown ${where}. Leave empty to hide it. Phone photos are resized automatically.`,
  heading: "optional",
  headingLabel: "Caption (optional)",
  body: false,
  image: true,
  imageLabel: "Photo",
  defaults: { heading: "", body: "" },
});

// A small line of text, e.g. the label above a title or a button's words.
const line = (key: string, title: string, heading: string, hint?: string): SectionDef => ({
  key,
  title,
  heading: "required",
  headingLabel: title,
  headingHint: hint,
  body: false,
  image: false,
  defaults: { heading, body: "" },
});

// The title of a homepage section and the small line above it.
const sectionTitle = (key: string, title: string, eyebrow: string): SectionDef => ({
  key,
  title: "Section title",
  heading: "required",
  headingLabel: "Section title",
  body: true,
  bodyKind: "line",
  bodyLabel: "Small line above the title",
  image: false,
  defaults: { heading: title, body: eyebrow },
});

// A design photo (the banner collage and the host circle). Until one is
// uploaded, the website shows a labelled placeholder for it.
const designPhoto = (key: string, title: string, hint: string): SectionDef => ({
  key,
  title,
  heading: "none",
  body: false,
  image: true,
  imageLabel: title,
  imageHint: hint,
  defaults: { heading: "", body: "" },
});

// Kinds of gatherings shown in the moving ribbon under the homepage banner.
export const RIBBON_DEFAULT = ["Coffee mornings", "Sea swims", "Book clubs", "Hill walks", "Poetry nights", "Board games", "Craft circles", "Picnics"];

export const FOOTER_TEXT = "A community for LGBTQ+ women and non-binary people across the island of Ireland.";
export const HOST_CTA_TEXT = "A coffee, a walk, a book swap. Small is perfect. We'll help you share it.";

export const PAGE_SECTIONS: Record<ContentPage, SectionDef[]> = {
  home: [
    line("hero_eyebrow", "Small line above the headline", "Events · Stories · Community"),
    {
      key: "hero",
      title: "Headline, text and main photo",
      heading: "required",
      headingLabel: "Headline",
      headingHint: "The word LGBTQ+ gets a soft highlight automatically.",
      body: true,
      bodyLabel: "Text under the headline (optional)",
      image: true,
      imageLabel: "Main photo (the big arch shape)",
      imageHint: "If you leave this empty, the built-in photo of a gathering is shown.",
      defaults: { heading: HERO_HEADING, body: "" },
    },
    {
      key: "hero_buttons",
      title: "Buttons",
      heading: "required",
      headingLabel: "First button (opens Events)",
      body: true,
      bodyKind: "line",
      bodyLabel: "Second button (opens Stories)",
      image: false,
      defaults: { heading: "Find events", body: "Stories & poetry" },
    },
    designPhoto("hero_photo_2", "Round photo", "The small circle at the bottom left of the photo collage. Square photos work best."),
    designPhoto("hero_photo_3", "Tall photo", "The tilted tall photo at the top right of the collage. Portrait photos work best."),
    line("hero_sticker", "Sticker", "You belong here", "The white tilted sticker on the photo collage."),
    {
      key: "ribbon",
      title: "Moving ribbon",
      heading: "none",
      body: true,
      bodyKind: "lines",
      bodyLabel: "Activities (one per line)",
      bodyHint: "Each line becomes one item in the violet strip that scrolls under the banner.",
      image: false,
      defaults: { heading: "", body: RIBBON_DEFAULT.join("\n") },
    },
    {
      key: "intro",
      title: "Introduction",
      hint: "Leave the heading empty to hide the introduction.",
      heading: "optional",
      headingLabel: "Introduction heading (optional)",
      body: true,
      bodyLabel: "Introduction text (optional)",
      image: false,
      defaults: { heading: "", body: "" },
    },
    value(1, "Local events", "Find gatherings near you."),
    value(2, "A safe and inclusive space", "For LGBTQ+ women and non-binary people."),
    value(3, "Community led", "Created by and for our community."),
    sectionTitle("photos_heading", "Moments from our events", "Snapshots"),
    photo(1, "on the homepage under “Moments from our events”"),
    photo(2, "on the homepage under “Moments from our events”"),
    photo(3, "on the homepage under “Moments from our events”"),
    sectionTitle("events_heading", "Upcoming events", "What's on"),
    line("host_eyebrow", "Small line above the title", "Bring people together"),
    {
      key: "host_cta",
      title: "Invitation to host",
      heading: "required",
      headingLabel: "Title",
      body: true,
      bodyLabel: "Text",
      image: false,
      defaults: { heading: "Want to host an event?", body: HOST_CTA_TEXT },
    },
    line("host_button", "Button", "Host an event"),
    designPhoto("host_photo", "Photo in the circle", "Shown on the right of the violet panel. A host welcoming people works well. Square photos work best."),
    sectionTitle("stories_heading", STORIES_TITLE, "From the community"),
    sectionTitle("podcast_heading", "Latest podcast", "Listen in"),
    sectionTitle("gallery_heading", "Our community, together", "Gallery"),
    line("footer", "Footer text", FOOTER_TEXT, "The short line under the name in the dark footer at the bottom of every page."),
  ],
  about: [
    line("about_eyebrow", "Small line above the title", "Who we are"),
    {
      key: "about",
      title: "About Conscious Connections",
      hint: "A line starting with ## is a sub-heading. Lines starting with * are bullet points. Email addresses become links.",
      heading: "required",
      headingLabel: "Page title",
      body: true,
      bodyLabel: "Text",
      bodyHint: "Each part that starts with a ## sub-heading gets one of the photos below beside it.",
      image: true,
      imageLabel: "Wide banner photo (optional)",
      imageHint: "Shown across the page under the title.",
      blocks: true,
      defaults: { heading: "About Conscious Connections", body: ABOUT_BODY },
    },
    photo(1, "on the About page, beside the first part of the text (the first ## sub-heading)"),
    photo(2, "on the About page, beside the second part of the text"),
    photo(3, "on the About page, beside the third part of the text"),
  ],
  pages: [
    line("events_eyebrow", "Small line above the title", "What's on"),
    intro("events", "Events", "Events", "Discover local events for LGBTQ+ women and non-binary people across the island of Ireland."),
    line("stories_eyebrow", "Small line above the title", "From the community"),
    intro("stories", "Stories and poetry", STORIES_TITLE, "Real experiences, stories and poems from our community."),
    intro("share_story", "Share your story", "Share your story or poem", "Your experience could help someone feel less alone. Tell us about finding community, moving somewhere new, or share a poem you'd like others to read."),
    line("podcasts_eyebrow", "Small line above the title", "Listen in"),
    intro("podcasts", "Podcasts", "Podcasts", "Conversations about community, identity and life across the island of Ireland."),
    line("gallery_eyebrow", "Small line above the title", "Snapshots"),
    intro("gallery", "Gallery", "Gallery", "Moments from our events and community."),
    line("submit_event_eyebrow", "Small line above the title", "Bring people together"),
    intro(
      "submit_event",
      "Host an event",
      "Host an event",
      "Create a local event and bring people together. It's quick and easy, and it helps build our community. Our team reviews every event before it goes live.",
    ),
  ],
  // Community Guidelines (/guidelines). Each part has its own link: /guidelines#events, /guidelines#stories.
  guidelines: [
    line("intro_eyebrow", "Small line above the title", "Look after each other"),
    {
      key: "intro",
      title: "Page title and introduction",
      heading: "required",
      headingLabel: "Page title",
      body: true,
      bodyLabel: "Introduction",
      image: false,
      defaults: {
        heading: "Community Guidelines",
        body: "These guidelines help keep Conscious Connections a safe, welcoming and inclusive space for everyone.",
      },
    },
    guideline("events", "Hosting and attending events"),
    guideline("stories", "Sharing stories and poetry"),
  ],
};

export function sectionDef(page: string, key: string): SectionDef | undefined {
  return PAGE_SECTIONS[page as ContentPage]?.find((s) => s.key === key);
}

export const PHOTO_KEYS = ["photo_1", "photo_2", "photo_3"] as const;

// ---------------------------------------------------------------------------
// Admin editor: the sections grouped into the parts of the page you can see,
// numbered in page order. The same numbers label the parts in the preview.
// ---------------------------------------------------------------------------

export type Area = { key: string; title: string; hint: string; rows: string[] };

export const PAGE_AREAS: Record<ContentPage, Area[]> = {
  home: [
    {
      key: "banner",
      title: "Top banner",
      hint: "The first thing visitors see: the headline, two buttons and the photo collage.",
      rows: ["hero_eyebrow", "hero", "hero_buttons", "hero_photo_2", "hero_photo_3", "hero_sticker"],
    },
    { key: "ribbon", title: "Moving ribbon", hint: "The violet strip of activities that scrolls under the banner.", rows: ["ribbon"] },
    { key: "intro", title: "Introduction and 3 cards", hint: "An optional introduction, and the three coloured cards with drawings.", rows: ["intro", "value_1", "value_2", "value_3"] },
    { key: "photos", title: "Moments from our events", hint: "Three event photos in white frames. Empty slots show a placeholder.", rows: ["photos_heading", "photo_1", "photo_2", "photo_3"] },
    { key: "events", title: "Upcoming events", hint: "The next three live events appear here by themselves. You can change the title.", rows: ["events_heading"] },
    { key: "host", title: "Invitation to host", hint: "The violet panel asking people to host an event.", rows: ["host_eyebrow", "host_cta", "host_button", "host_photo"] },
    { key: "stories", title: "Stories and poetry", hint: "The newest published stories appear here by themselves. Hidden until one is published.", rows: ["stories_heading"] },
    { key: "podcast", title: "Latest podcast", hint: "The newest published podcast appears here by itself. Hidden until one is published.", rows: ["podcast_heading"] },
    { key: "gallery", title: "Gallery strip", hint: "The newest gallery photos appear here by themselves. Hidden until the gallery has photos.", rows: ["gallery_heading"] },
    { key: "footer", title: "Footer", hint: "The dark strip at the bottom of every page.", rows: ["footer"] },
  ],
  about: [
    { key: "about", title: "Title and text", hint: "The page title, the optional wide photo and the About text.", rows: ["about_eyebrow", "about"] },
    { key: "photos", title: "Photos beside the text", hint: "One photo beside each part of the text that starts with a ## sub-heading.", rows: ["photo_1", "photo_2", "photo_3"] },
  ],
  pages: [
    { key: "events", title: "Events page", hint: "The top of the Events page. The events list below comes from Events.", rows: ["events_eyebrow", "events"] },
    { key: "stories", title: "Stories and poetry page", hint: "The top of the Stories page. The stories below come from Stories.", rows: ["stories_eyebrow", "stories"] },
    { key: "share_story", title: "Share your story page", hint: "The top of the page with the form for sharing a story or poem.", rows: ["share_story"] },
    { key: "podcasts", title: "Podcasts page", hint: "The top of the Podcasts page. The episodes below come from Podcasts.", rows: ["podcasts_eyebrow", "podcasts"] },
    { key: "gallery", title: "Gallery page", hint: "The top of the Gallery page. The photos below come from Gallery.", rows: ["gallery_eyebrow", "gallery"] },
    { key: "submit_event", title: "Host an event page", hint: "The top of the page with the form for hosting an event.", rows: ["submit_event_eyebrow", "submit_event"] },
  ],
  guidelines: [
    { key: "intro", title: "Title and introduction", hint: "The top of the Community Guidelines page.", rows: ["intro_eyebrow", "intro"] },
    { key: "events", title: "Hosting and attending events", hint: "The first part of the guidelines. The event form links here.", rows: ["events"] },
    { key: "stories", title: "Sharing stories and poetry", hint: "The second part. The story form links here.", rows: ["stories"] },
  ],
};

export type SectionValues = { key: string; heading: string; body: string; image_path: string | null; image_alt: string };
export type RawSection = { key: string; heading?: string | null; body?: string | null; image_path?: string | null; image_alt?: string | null };

// Every section of a page, in order, with the built-in wording filling any gap
// (used by the public pages and by the admin preview, so they always match).
export function withDefaults(page: ContentPage, rows: Iterable<RawSection>): Record<string, SectionValues> {
  const byKey = new Map([...rows].map((r) => [r.key, r]));
  return Object.fromEntries(
    PAGE_SECTIONS[page].map((def) => {
      const row = byKey.get(def.key);
      return [
        def.key,
        {
          key: def.key,
          heading: row?.heading?.trim() || def.defaults.heading,
          body: row?.body?.trim() || def.defaults.body,
          image_path: def.image ? (row?.image_path ?? null) : null,
          image_alt: row?.image_alt?.trim() ?? "",
        },
      ];
    }),
  );
}

// The items of a "lines" text: one per non-empty line.
export function linesOf(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// The photo slots that have a photo, in order.
export function photosOf(sections: Record<string, SectionValues>) {
  return PHOTO_KEYS.map((k) => sections[k]).filter((s): s is SectionValues => Boolean(s?.image_path));
}
