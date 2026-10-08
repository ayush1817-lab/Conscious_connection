import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

// Read-only queries for the public content pages. All go through the anon
// client, so RLS guarantees only published content is returned.

export type Section = { key: string; heading: string; body: string; image_path: string | null };

export async function getSections(page: "home" | "about") {
  const { data, error } = await createPublicClient()
    .from("site_sections")
    .select("key, heading, body, image_path")
    .eq("page", page)
    .order("sort_order");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((s) => [s.key, s])) as Record<string, Section | undefined>;
}

export async function getStories(limit?: number) {
  let query = createPublicClient()
    .from("stories")
    .select("id, title, slug, cover_path, body, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getStory(slug: string) {
  const { data, error } = await createPublicClient()
    .from("stories")
    .select("id, title, slug, cover_path, body, published_at")
    .eq("published", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPodcasts(limit?: number) {
  let query = createPublicClient()
    .from("podcasts")
    .select("id, title, description, youtube_url, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getGallery(limit?: number) {
  let query = createPublicClient().from("gallery_images").select("id, image_path, caption").order("sort_order");
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// First paragraph of a story, without the **bold**/*italic* markers, for cards and previews.
export function excerpt(body: string, max = 160) {
  const first = body.replace(/\r\n/g, "\n").split(/\n\s*\n/)[0]?.replace(/\*\*?/g, "").trim() ?? "";
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}
