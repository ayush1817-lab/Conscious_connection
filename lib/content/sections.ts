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
  defaults: { heading: string; body: string };
};

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
      defaults: { heading: "A community for women and non-binary people across rural Ireland.", body: "" },
    },
    { key: "intro", title: "Introduction", heading: "optional", body: true, image: false, defaults: { heading: "", body: "" } },
    value(1, "Local events", "Find gatherings near you across rural counties."),
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
      heading: "required",
      body: true,
      image: true,
      defaults: { heading: "About Conscious Connections", body: "" },
    },
    photo(1, "on the About page, under the text"),
    photo(2, "on the About page, under the text"),
    photo(3, "on the About page, under the text"),
  ],
  pages: [
    intro("events", "Events", "Events", "Discover local events for LGBTQ+ women and non-binary people across rural Ireland."),
    intro("stories", "Stories", "Stories", "Real experiences from our community."),
    intro("share_story", "Share your story", "Share your story", "Your experience could help someone feel less alone. Tell us about finding community, moving somewhere new, or anything you'd like others to hear."),
    intro("podcasts", "Podcasts", "Podcasts", "Conversations about community, identity and life in rural Ireland."),
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
