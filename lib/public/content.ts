import "server-only";
import { PAGE_SECTIONS, PHOTO_KEYS, type ContentPage } from "@/lib/content/sections";
import { createPublicClient } from "@/lib/supabase/public";
import { isMissingSchema, warnMissingSchema } from "./schema-guard";

// Read-only queries for the public content pages. All go through the anon
// client, so RLS guarantees only published content is returned.

export type Section = { key: string; heading: string; body: string; image_path: string | null; image_alt: string };

// Every section of a page, in order, with the built-in wording filling any gap.
type SectionRow = { key: string; heading: string; body: string; image_path: string | null; image_alt?: string | null };

async function sectionRows(page: ContentPage): Promise<SectionRow[]> {
  const sections = () => createPublicClient().from("site_sections").select("key, heading, body, image_path, image_alt").eq("page", page);
  const { data, error } = await sections();
  if (!isMissingSchema(error)) {
    if (error) throw error;
    return data ?? [];
  }
  // Before the photo update, there is no image_alt column.
  warnMissingSchema("site_sections.image_alt", error);
  const old = await createPublicClient().from("site_sections").select("key, heading, body, image_path").eq("page", page);
  if (old.error) throw old.error;
  return old.data ?? [];
}

export async function getSections(page: ContentPage) {
  const rows = new Map((await sectionRows(page)).map((s) => [s.key, s]));
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

// The title and introduction of one of the other public pages (Website content > Other pages).
export async function getPageIntro(key: string): Promise<Section> {
  const sections = await getSections("pages");
  return sections[key];
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
  const story = (columns: string) =>
    createPublicClient().from("stories").select(columns).eq("published", true).eq("slug", slug).maybeSingle();
  type Story = { id: string; title: string; slug: string; cover_path: string | null; body: string; published_at: string | null; author_name: string | null };
  const { data, error } = await story("id, title, slug, cover_path, body, published_at, author_name");
  if (!isMissingSchema(error)) {
    if (error) throw error;
    return data as unknown as Story | null;
  }
  // Before the "Share your story" update, there is no author_name column.
  warnMissingSchema("stories.author_name", error);
  const old = await story("id, title, slug, cover_path, body, published_at");
  if (old.error) throw old.error;
  return old.data ? ({ ...(old.data as object), author_name: null } as Story) : null;
}

export async function getPodcasts(limit?: number) {
  const podcasts = (columns: string) => {
    let query = createPublicClient()
      .from("podcasts")
      .select(columns)
      .eq("published", true)
      .order("published_at", { ascending: false, nullsFirst: false });
    if (limit) query = query.limit(limit);
    return query;
  };
  type Podcast = {
    id: string;
    title: string;
    description: string;
    source: "youtube" | "spotify" | "audio";
    youtube_url: string | null;
    spotify_url: string | null;
    audio_path: string | null;
    published_at: string | null;
  };
  const { data, error } = await podcasts("id, title, description, source, youtube_url, spotify_url, audio_path, published_at");
  if (!isMissingSchema(error)) {
    if (error) throw error;
    return (data ?? []) as unknown as Podcast[];
  }
  // Before the podcast update, every episode is a YouTube link.
  warnMissingSchema("podcasts.source", error);
  const old = await podcasts("id, title, description, youtube_url, published_at");
  if (old.error) throw old.error;
  return ((old.data ?? []) as unknown as Omit<Podcast, "source" | "spotify_url" | "audio_path">[]).map(
    (p): Podcast => ({ ...p, source: "youtube", spotify_url: null, audio_path: null }),
  );
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
