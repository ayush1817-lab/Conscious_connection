// The editable sections of each content page (site_sections rows, keyed by
// page + key). Public pages fall back to `defaults` when a row is missing or a
// field is left empty, so the site never shows a blank section.

export type ContentPage = "home" | "about";

export type SectionDef = {
  key: string;
  // Name shown in the admin.
  title: string;
  // Short explanation shown under the title in the admin.
  hint?: string;
  heading: "required" | "optional" | "none";
  headingLabel?: string;
  body: boolean;
  image: boolean;
  defaults: { heading: string; body: string };
};

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
};

export function sectionDef(page: string, key: string): SectionDef | undefined {
  return PAGE_SECTIONS[page as ContentPage]?.find((s) => s.key === key);
}

export const PHOTO_KEYS = ["photo_1", "photo_2", "photo_3"] as const;
