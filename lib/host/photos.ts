// Photos hosts send from their private host page (Karina's feedback, Oct 2026).
// They go to a private bucket and wait for an admin to approve them.

export const PHOTO_BUCKET = "gallery-submissions";
// Photos waiting or approved, per event.
export const MAX_PHOTOS_PER_EVENT = 20;
// At most this many in one go.
export const MAX_PHOTOS_PER_SEND = 10;
export const CAPTION_MAX = 200;

// Paths are <event id>/<random id>.<ext>; anything else wasn't made by us.
export function isHostPhotoPath(path: string, eventId: string) {
  return path.startsWith(`${eventId}/`) && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path);
}
