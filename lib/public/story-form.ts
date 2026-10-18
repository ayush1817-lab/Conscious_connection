// Shared limits for the public "Share your story" form (match the migration).
export const STORY_LIMITS = { title: 150, body: 10000, bodyMin: 50, name: 80 } as const;

// Images from the public form are uploaded here (content bucket), under a random name.
export const STORY_IMAGE_FOLDER = "story-submissions";

export function isStoryImagePath(path: string) {
  return new RegExp(`^${STORY_IMAGE_FOLDER}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path);
}
