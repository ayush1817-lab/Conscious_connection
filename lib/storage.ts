import { publicEnv } from "@/lib/env";

export type Bucket = "posters" | "gallery" | "content";

// Public URL for an image in one of the public-read buckets.
export function publicImageUrl(bucket: Bucket, path: string) {
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
