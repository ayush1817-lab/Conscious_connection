// Photo slots that are part of the design. The admin uploads them in
// Website content › Homepage; until then a file here is used if `file` is set
// (put it in public/images/brand/), otherwise a labelled placeholder.
// The list for whoever supplies photos is docs/brand-images.md.

export type BrandImage = {
  // File name in public/images/brand/, or null while the placeholder shows.
  file: string | null;
  // Alt text once the photo is in (empty for a purely decorative photo).
  alt: string;
  // What the placeholder asks for.
  label: string;
  suggestion: string;
  size: string;
};

export type BrandImageSlot = "hero-circle" | "hero-pill" | "host-photo";

export const BRAND_IMAGES: Record<BrandImageSlot, BrandImage> = {
  "hero-circle": {
    file: null,
    alt: "",
    label: "Hero photo 2",
    suggestion: "Close-up of two or three friends laughing over tea or coffee",
    size: "800 × 800 px, square",
  },
  "hero-pill": {
    file: null,
    alt: "",
    label: "Hero photo 3",
    suggestion: "An outdoor moment: a sea swim, a hill walk or a picnic",
    size: "600 × 900 px, portrait",
  },
  "host-photo": {
    file: null,
    alt: "",
    label: "Host photo",
    suggestion: "A host welcoming people at a small meetup, smiling at the camera",
    size: "900 × 900 px, square",
  },
};

// Placeholders for empty photo slots (design slots above, and the admin's
// event photo slots) are shown so it's clear which photos are still needed.
// Set to false to hide every empty slot instead.
export const SHOW_PLACEHOLDERS = true;
