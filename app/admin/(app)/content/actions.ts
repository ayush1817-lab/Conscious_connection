"use server";

import { revalidatePublicSite } from "@/lib/revalidate";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { IMAGE_TARGETS, isUploadedImagePath, type ImageTarget } from "@/lib/content/images";
import { slugify } from "@/lib/content/slug";
import { youtubeVideoId } from "@/lib/content/youtube";
import { setFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string };

type Client = Awaited<ReturnType<typeof createClient>>;

const SAVED = "Saved. Your changes are live.";

// Browsers send textarea line breaks as \r\n; store plain \n.
function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function tooLong(value: string, max: number, label: string) {
  return value.length > max ? `${label} can be up to ${max} characters (it's ${value.length}).` : null;
}

// The image path the form sent: unchanged, removed (null), or a new upload.
// Returns an error for anything that isn't a path we could have created.
function imagePath(formData: FormData, name: string, current: string | null, target: ImageTarget) {
  const value = text(formData, name) || null;
  if (value === current || value === null) return { path: value };
  if (!isUploadedImagePath(value, target.folder)) return { error: "That image couldn't be used. Please upload it again." };
  return { path: value };
}

async function removeImage(supabase: Client, target: ImageTarget, path: string | null) {
  if (path) await supabase.storage.from(target.bucket).remove([path]);
}

async function done(message = SAVED) {
  await setFlash(message);
  revalidatePublicSite();
}

// ---------------------------------------------------------------------------
// Homepage and About sections
// ---------------------------------------------------------------------------

export async function saveSection(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: section } = await supabase.from("site_sections").select("image_path").eq("id", id).maybeSingle();
  if (!section) return { error: "This section can't be found. Please reload the page." };

  const heading = text(formData, "heading");
  const body = text(formData, "body");
  const image = imagePath(formData, "image_path", section.image_path, IMAGE_TARGETS.sections);
  const error =
    (!heading ? "Please add a heading." : null) ??
    tooLong(heading, 150, "The heading") ??
    tooLong(body, 3000, "The text") ??
    ("error" in image ? image.error! : null);
  if (error) return { error };

  const { error: dbError } = await supabase
    .from("site_sections")
    .update({ heading, body, image_path: image.path ?? null })
    .eq("id", id);
  if (dbError) return { error: "Your changes couldn't be saved. Please try again." };
  if (section.image_path !== image.path) await removeImage(supabase, IMAGE_TARGETS.sections, section.image_path);

  await done();
  return {};
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

async function uniqueSlug(supabase: Client, title: string, exceptId?: string) {
  const base = slugify(title);
  const { data } = await supabase.from("stories").select("id, slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).filter((s) => s.id !== exceptId).map((s) => s.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function storyFields(formData: FormData, current: string | null) {
  const title = text(formData, "title");
  const body = text(formData, "body");
  const cover = imagePath(formData, "cover_path", current, IMAGE_TARGETS.stories);
  const error =
    (!title ? "Please add a title." : null) ??
    tooLong(title, 150, "The title") ??
    tooLong(body, 20000, "The story") ??
    ("error" in cover ? cover.error! : null);
  return { title, body, cover: cover.path ?? null, error };
}

export async function createStory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const fields = storyFields(formData, null);
  if (fields.error) return { error: fields.error };

  const { data, error } = await supabase
    .from("stories")
    .insert({ title: fields.title, body: fields.body, cover_path: fields.cover, slug: await uniqueSlug(supabase, fields.title) })
    .select("id")
    .single();
  if (error) return { error: "The story couldn't be saved. Please try again." };

  await done("Story saved as a draft. Publish it when you're ready.");
  redirect(`/admin/content/stories/${data.id}`);
}

export async function saveStory(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: story } = await supabase.from("stories").select("cover_path, published").eq("id", id).maybeSingle();
  if (!story) return { error: "This story can't be found. It may have been deleted." };
  const fields = storyFields(formData, story.cover_path);
  if (fields.error) return { error: fields.error };

  const { error } = await supabase
    .from("stories")
    .update({ title: fields.title, body: fields.body, cover_path: fields.cover })
    .eq("id", id);
  if (error) return { error: "Your changes couldn't be saved. Please try again." };
  if (story.cover_path !== fields.cover) await removeImage(supabase, IMAGE_TARGETS.stories, story.cover_path);

  await done(story.published ? SAVED : "Saved. This story is still a draft.");
  return {};
}

export async function setStoryPublished(id: string, published: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: story } = await supabase.from("stories").select("published_at").eq("id", id).maybeSingle();
  if (!story) return;
  await supabase
    .from("stories")
    .update({ published, published_at: published ? (story.published_at ?? new Date().toISOString()) : story.published_at })
    .eq("id", id);
  await done(published ? "Published. The story is now on the website." : "Unpublished. The story is hidden from the website.");
}

export async function deleteStory(id: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: story } = await supabase.from("stories").delete().eq("id", id).select("cover_path").maybeSingle();
  if (story) await removeImage(supabase, IMAGE_TARGETS.stories, story.cover_path);
  await done("Story deleted.");
  redirect("/admin/content/stories");
}

// ---------------------------------------------------------------------------
// Podcasts
// ---------------------------------------------------------------------------

function podcastFields(formData: FormData) {
  const title = text(formData, "title");
  const description = text(formData, "description");
  const youtubeUrl = text(formData, "youtube_url");
  const error =
    (!title ? "Please add a title." : null) ??
    tooLong(title, 150, "The title") ??
    tooLong(description, 500, "The description") ??
    (!youtubeUrl ? "Please paste the YouTube link." : null) ??
    (youtubeVideoId(youtubeUrl) ? null : "That doesn't look like a YouTube video link. Copy it from the Share button on YouTube.");
  return { title, description, youtube_url: youtubeUrl, error };
}

export async function createPodcast(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { error: invalid, ...fields } = podcastFields(formData);
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const { data, error } = await supabase.from("podcasts").insert(fields).select("id").single();
  if (error) return { error: "The podcast couldn't be saved. Please try again." };
  await done("Podcast saved as a draft. Publish it when you're ready.");
  redirect(`/admin/content/podcasts/${data.id}`);
}

export async function savePodcast(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { error: invalid, ...fields } = podcastFields(formData);
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const { data, error } = await supabase.from("podcasts").update(fields).eq("id", id).select("published").maybeSingle();
  if (error || !data) return { error: "Your changes couldn't be saved. Please try again." };
  await done(data.published ? SAVED : "Saved. This podcast is still a draft.");
  return {};
}

export async function setPodcastPublished(id: string, published: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: podcast } = await supabase.from("podcasts").select("published_at").eq("id", id).maybeSingle();
  if (!podcast) return;
  await supabase
    .from("podcasts")
    .update({ published, published_at: published ? (podcast.published_at ?? new Date().toISOString()) : podcast.published_at })
    .eq("id", id);
  await done(published ? "Published. The podcast is now on the website." : "Unpublished. The podcast is hidden from the website.");
}

export async function deletePodcast(id: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("podcasts").delete().eq("id", id);
  await done("Podcast deleted.");
  redirect("/admin/content/podcasts");
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

// Called after the browser has uploaded the files to the gallery bucket.
export async function addGalleryImages(paths: string[]): Promise<FormState> {
  await requireAdmin();
  const valid = paths.filter((p) => isUploadedImagePath(p, IMAGE_TARGETS.gallery.folder));
  if (!valid.length) return { error: "No images were added." };
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("gallery_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const start = (last?.sort_order ?? 0) + 1;
  const { error } = await supabase
    .from("gallery_images")
    .insert(valid.map((image_path, i) => ({ image_path, sort_order: start + i })));
  if (error) return { error: "The images couldn't be added. Please try again." };
  await done(valid.length === 1 ? "1 image added. It's now in the gallery." : `${valid.length} images added. They're now in the gallery.`);
  return {};
}

export async function saveCaption(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const caption = text(formData, "caption");
  const error = tooLong(caption, 200, "The caption");
  if (error) return { error };
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("gallery_images").update({ caption: caption || null }).eq("id", id);
  if (dbError) return { error: "The caption couldn't be saved. Please try again." };
  await done("Caption saved. Your changes are live.");
  return {};
}

// Up/down reorder. Renumbers the whole gallery 1..n so gaps and ties can't build up.
export async function moveGalleryImage(id: string, direction: "up" | "down") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: images } = await supabase.from("gallery_images").select("id").order("sort_order").order("created_at");
  if (!images) return;
  const ids = images.map((i) => i.id);
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await Promise.all(ids.map((imageId, i) => supabase.from("gallery_images").update({ sort_order: i + 1 }).eq("id", imageId)));
  await done(direction === "up" ? "Moved earlier. Your changes are live." : "Moved later. Your changes are live.");
}

export async function deleteGalleryImage(id: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: image } = await supabase.from("gallery_images").delete().eq("id", id).select("image_path").maybeSingle();
  if (image) await supabase.storage.from("gallery").remove([image.image_path]);
  await done("Image deleted from the gallery.");
  return {};
}
