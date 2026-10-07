import type { Bucket } from "@/lib/storage";

// Same limits as the storage buckets (see the initial migration).
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Plain-language reason a file can't be used, or null if it's fine.
export function imageProblem(file: { name: string; type: string; size: number }): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `"${file.name}" isn't a JPG, PNG or WebP image.`;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB. Images can be up to 5MB.`;
  }
  return null;
}

export function newImagePath(folder: string, type: string) {
  return `${folder}/${crypto.randomUUID()}.${EXTENSIONS[type] ?? "jpg"}`;
}

// Image paths sent from the browser must be ones newImagePath() could have made.
export function isUploadedImagePath(path: string, folder: string) {
  return new RegExp(`^${folder}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path);
}

export type ImageTarget = { bucket: Bucket; folder: string };
export const IMAGE_TARGETS = {
  sections: { bucket: "content", folder: "sections" },
  stories: { bucket: "content", folder: "stories" },
  gallery: { bucket: "gallery", folder: "uploads" },
} satisfies Record<string, ImageTarget>;
