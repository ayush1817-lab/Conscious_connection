import "server-only";
import { PAGE_SECTIONS, PHOTO_KEYS, type ContentPage } from "@/lib/content/sections";
import { createPublicClient } from "@/lib/supabase/public";

// Read-only queries for the public content pages. All go through the anon
// client, so RLS guarantees only published content is returned.

export type Section = { key: string; heading: string; body: string; image_path: string | null; image_alt: string };

// Every section of a page, in order, with the built-in wording filling any gap.
export async function getSections(page: ContentPage) {
  const { data, error } = await createPublicClient()
    .from("site_sections")
    .select("key, heading, body, image_path, image_alt")
    .eq("page", page);
  if (error) throw error;
  const rows = new Map((data ?? []).map((s) => [s.key, s]));
  return Object.fromEntries(
    PAGE_SECTIONS[page].map((def) => {
      const row = rows.get(def.key);
      const section: Section = {
        key: def.key,
        heading: row?.heading?.trim() || def.defaults.heading,
        body: row?.body?.trim() || def.defaults.body,
        image_path: def.image ? (row?.image_path ?? null) : null,
        image_alt: row?.image_alt?.trim() ?? "",
      };
      return [def.key, section];
    }),
  ) as Record<string, Section>;
}

// The photo slots that have a photo, in order.
export function photosOf(sections: Record<string, Section>) {
  return PHOTO_KEYS.map((k) => sections[k]).filter((s): s is Section => Boolean(s?.image_path));
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
    .select("id, title, slug, cover_path, body, published_at, author_name")
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
