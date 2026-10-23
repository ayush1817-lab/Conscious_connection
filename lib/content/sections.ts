// The editable sections of each content page (site_sections rows, keyed by
// page + key). Public pages fall back to `defaults` when a row is missing or a
// field is left empty, so the site never shows a blank section.

// "pages" holds the title and introduction of the other public pages.
export type ContentPage = "home" | "about" | "pages";

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
  image: boolean;
  // Longer page text: sub-headings ("## "), bullet points ("* ") and links.
  blocks?: boolean;
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

const photo = (n: number, where: string): SectionDef => ({
  key: `photo_${n}`,
  title: `Event photo ${n}`,
  hint: `Shown ${where}. Leave empty to hide it. Phone photos are resized automatically.`,
  heading: "optional",
  headingLabel: "Caption (optional)",
  body: false,
  image: true,
  defaults: { heading: "", body: "" },
});

export const PAGE_SECTIONS: Record<ContentPage, SectionDef[]> = {
  home: [
    {
      key: "hero",
      title: "Top banner",
      heading: "required",
      body: true,
      image: true,
      defaults: { heading: HERO_HEADING, body: "" },
    },
    { key: "intro", title: "Introduction", heading: "optional", body: true, image: false, defaults: { heading: "", body: "" } },
    value(1, "Local events", "Find gatherings near you."),
    value(2, "A safe and inclusive space", "For LGBTQ+ women and non-binary people."),
    value(3, "Community led", "Created by and for our community."),
    photo(1, "on the homepage under “Moments from our events”"),
    photo(2, "on the homepage under “Moments from our events”"),
    photo(3, "on the homepage under “Moments from our events”"),
    {
      key: "host_cta",
      title: "Invitation to host",
      heading: "required",
      body: true,
      image: false,
      defaults: { heading: "Want to host an event?", body: "" },
    },
  ],
  about: [
    {
      key: "about",
      title: "About Conscious Connections",
      hint: "A line starting with ## is a sub-heading. Lines starting with * are bullet points. Email addresses become links.",
      heading: "required",
      body: true,
      bodyLabel: "Text",
      image: true,
      blocks: true,
      defaults: { heading: "About Conscious Connections", body: ABOUT_BODY },
    },
    photo(1, "on the About page, under the text"),
    photo(2, "on the About page, under the text"),
    photo(3, "on the About page, under the text"),
  ],
  pages: [
    intro("events", "Events", "Events", "Discover local events for LGBTQ+ women and non-binary people across the island of Ireland."),
    intro("stories", "Stories and poetry", STORIES_TITLE, "Real experiences, stories and poems from our community."),
    intro("share_story", "Share your story", "Share your story or poem", "Your experience could help someone feel less alone. Tell us about finding community, moving somewhere new, or share a poem you'd like others to read."),
    intro("podcasts", "Podcasts", "Podcasts", "Conversations about community, identity and life across the island of Ireland."),
    intro("gallery", "Gallery", "Gallery", "Moments from our events and community."),
    intro(
      "submit_event",
      "Host an event",
      "Host an event",
      "Create a local event and bring people together. It's quick and easy, and it helps build our community. Our team reviews every event before it goes live.",
    ),
  ],
};

export function sectionDef(page: string, key: string): SectionDef | undefined {
  return PAGE_SECTIONS[page as ContentPage]?.find((s) => s.key === key);
}

export const PHOTO_KEYS = ["photo_1", "photo_2", "photo_3"] as const;
