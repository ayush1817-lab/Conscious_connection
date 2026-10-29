"use server";

import { revalidatePublicSite } from "@/lib/revalidate";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { IMAGE_TARGETS, isUploadedImagePath, newImagePath, type ImageTarget } from "@/lib/content/images";
import { PHOTO_BUCKET } from "@/lib/host/photos";
import { linesOf, PAGE_AREAS, sectionDef, type ContentPage, type SectionDef } from "@/lib/content/sections";
import { slugify } from "@/lib/content/slug";
import { AUDIO_BUCKET, isAudioPath } from "@/lib/content/podcast-audio";
import type { PodcastSource } from "@/lib/content/podcast-media";
import { spotifyEpisodeId, spotifyEpisodeUrl } from "@/lib/content/spotify";
import { youtubeVideoId } from "@/lib/content/youtube";
import { setFlash } from "@/lib/flash";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; savedAt?: number };

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
// Homepage, About, Other pages and Guidelines
// ---------------------------------------------------------------------------

type SectionUpdate = { heading: string; body: string; image_path: string | null; image_alt: string | null };

// One section's fields from the form (named "<key>.heading", "<key>.body"...),
// checked against its definition. Returns the update or a plain-language error.
function readSection(def: SectionDef, key: string, current: string | null, formData: FormData): { update: SectionUpdate } | { error: string } {
  const field = (name: string) => text(formData, `${key}.${name}`);
  const heading = def.heading === "none" ? "" : field("heading").replace(/\s*\n\s*/g, " ");
  let body = def.body ? field("body") : "";
  if (def.bodyKind === "line") body = body.replace(/\s*\n\s*/g, " ");
  if (def.bodyKind === "lines") body = linesOf(body).join("\n");
  const image = def.image ? imagePath(formData, `${key}.image_path`, current, IMAGE_TARGETS.sections) : { path: null };
  const alt = image.path ? field("image_alt") : "";
  const label = (name: string) => `“${name}”`;
  const error =
    (!heading && def.heading === "required" ? `Please fill in ${label(def.headingLabel ?? "Heading")}.` : null) ??
    tooLong(heading, 150, label(def.headingLabel ?? "The heading")) ??
    (def.body && !body && def.bodyKind && def.bodyKind !== "rich" ? `Please fill in ${label(def.bodyLabel ?? "Text")}.` : null) ??
    tooLong(body, def.bodyKind === "line" ? 150 : (def.maxBody ?? 3000), label(def.bodyLabel ?? "The text")) ??
    ("error" in image ? image.error! : null) ??
    (image.path && !alt ? `Please describe ${label(def.imageLabel ?? "the image")}, for people who use screen readers.` : null) ??
    tooLong(alt, 300, "The image description");
  if (error) return { error };
  return { update: { heading, body, image_path: image.path ?? null, image_alt: alt || null } };
}

// Saves one part of a page (Website content > Homepage, About...): every
// section in that part at once, so one Save button covers what you see.
export async function saveArea(page: ContentPage, areaKey: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const area = PAGE_AREAS[page]?.find((a) => a.key === areaKey);
  if (!area) return { error: "This part of the page can't be found. Please reload the page." };
  const supabase = await createClient();
  const { data: rows } = await supabase.from("site_sections").select("id, key, image_path").eq("page", page).in("key", area.rows);

  const updates: { id: string; old: string | null; update: SectionUpdate }[] = [];
  for (const key of area.rows) {
    const def = sectionDef(page, key);
    const row = rows?.find((r) => r.key === key);
    if (!def || !row) return { error: "Part of this section can't be found. Please reload the page." };
    const result = readSection(def, key, row.image_path, formData);
    if ("error" in result) return { error: area.rows.length > 1 ? `${def.title}: ${result.error}` : result.error };
    updates.push({ id: row.id, old: row.image_path, update: result.update });
  }

  for (const { id, update } of updates) {
    const { error } = await supabase.from("site_sections").update(update).eq("id", id);
    if (error) return { error: "Your changes couldn't be saved. Please try again." };
  }
  for (const { old, update } of updates) {
    if (old !== update.image_path) await removeImage(supabase, IMAGE_TARGETS.sections, old);
  }

  await done();
  return { savedAt: Date.now() };
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
  const authorName = text(formData, "author_name");
  const error =
    (!title ? "Please add a title." : null) ??
    tooLong(title, 150, "The title") ??
    tooLong(body, 20000, "The story") ??
    tooLong(authorName, 80, "The name") ??
    ("error" in cover ? cover.error! : null);
  return { title, body, cover: cover.path ?? null, author_name: authorName || null, error };
}

export async function createStory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const fields = storyFields(formData, null);
  if (fields.error) return { error: fields.error };

  const { data, error } = await supabase
    .from("stories")
    .insert({ title: fields.title, body: fields.body, cover_path: fields.cover, author_name: fields.author_name, slug: await uniqueSlug(supabase, fields.title) })
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
    .update({ title: fields.title, body: fields.body, cover_path: fields.cover, author_name: fields.author_name })
    .eq("id", id);
  if (error) return { error: "Your changes couldn't be saved. Please try again." };
  if (story.cover_path !== fields.cover) await removeImage(supabase, IMAGE_TARGETS.stories, story.cover_path);

  await done(story.published ? SAVED : "Saved. This story is still a draft.");
  return {};
}

export async function setStoryPublished(id: string, published: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: story } = await supabase.from("stories").select("published_at, slug").eq("id", id).maybeSingle();
  if (!story) {
    await setFlash("This story can't be found. It may have been deleted.", "error");
    redirect("/admin/content/stories");
  }
  const { error } = await supabase
    .from("stories")
    .update({ published, published_at: published ? (story.published_at ?? new Date().toISOString()) : story.published_at })
    .eq("id", id);
  if (error) {
    console.error("setStoryPublished failed", error);
    await setFlash(`The story couldn't be ${published ? "published" : "unpublished"}. Please try again.`, "error");
    revalidatePublicSite();
    return;
  }
  await done(published ? "Published. The story is now on the website." : "Unpublished. The story is hidden from the website.");
  if (published) redirect("/admin/content/stories");
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

// Exactly one of the three sources is kept; the other two are cleared.
async function podcastFields(formData: FormData) {
  const title = text(formData, "title");
  const description = text(formData, "description");
  const sourceValue = text(formData, "source") || "youtube";
  const source: PodcastSource = sourceValue === "spotify" || sourceValue === "audio" ? sourceValue : "youtube";
  const youtubeUrl = text(formData, "youtube_url");
  const spotifyUrl = text(formData, "spotify_url");
  const audioPath = text(formData, "audio_path");
  const episodeId = spotifyEpisodeId(spotifyUrl);

  let error =
    (!title ? "Please add a title." : null) ??
    tooLong(title, 150, "The title") ??
    tooLong(description, 500, "The description");
  if (!error && source === "youtube") {
    error =
      (!youtubeUrl ? "Please paste the YouTube link." : null) ??
      (youtubeVideoId(youtubeUrl) ? null : "That doesn't look like a YouTube video link. Copy it from the Share button on YouTube.");
  }
  if (!error && source === "spotify") {
    error =
      (!spotifyUrl ? "Please paste the Spotify episode link." : null) ??
      (episodeId ? null : "That doesn't look like a Spotify episode link. It should start with https://open.spotify.com/episode/");
  }
  if (!error && source === "audio") {
    if (!audioPath) error = "Please upload the audio file.";
    else if (!isAudioPath(audioPath)) error = "That audio file couldn't be used. Please upload it again.";
    else {
      const { data: exists } = await createAdminClient().storage.from(AUDIO_BUCKET).exists(audioPath);
      if (!exists) error = "The audio file didn't finish uploading. Please upload it again.";
    }
  }
  return {
    title,
    description,
    source,
    youtube_url: source === "youtube" ? youtubeUrl : null,
    // Stored without the ?si= share code.
    spotify_url: source === "spotify" && episodeId ? spotifyEpisodeUrl(episodeId) : null,
    audio_path: source === "audio" ? audioPath : null,
    error,
  };
}

export async function createPodcast(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { error: invalid, ...fields } = await podcastFields(formData);
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const { data, error } = await supabase.from("podcasts").insert(fields).select("id").single();
  if (error) return { error: "The podcast couldn't be saved. Please try again." };
  await done("Podcast saved as a draft. Publish it when you're ready.");
  redirect(`/admin/content/podcasts/${data.id}`);
}

export async function savePodcast(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { error: invalid, ...fields } = await podcastFields(formData);
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const { data: before } = await supabase.from("podcasts").select("audio_path").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("podcasts").update(fields).eq("id", id).select("published").maybeSingle();
  if (error || !data) return { error: "Your changes couldn't be saved. Please try again." };
  // A replaced or no-longer-used audio file is removed from storage.
  if (before?.audio_path && before.audio_path !== fields.audio_path) {
    await supabase.storage.from(AUDIO_BUCKET).remove([before.audio_path]);
  }
  await done(data.published ? SAVED : "Saved. This podcast is still a draft.");
  return {};
}

export async function setPodcastPublished(id: string, published: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: podcast } = await supabase.from("podcasts").select("published_at").eq("id", id).maybeSingle();
  if (!podcast) {
    await setFlash("This podcast can't be found. It may have been deleted.", "error");
    redirect("/admin/content/podcasts");
  }
  const { error } = await supabase
    .from("podcasts")
    .update({ published, published_at: published ? (podcast.published_at ?? new Date().toISOString()) : podcast.published_at })
    .eq("id", id);
  if (error) {
    console.error("setPodcastPublished failed", error);
    await setFlash(`The podcast couldn't be ${published ? "published" : "unpublished"}. Please try again.`, "error");
    revalidatePublicSite();
    return;
  }
  await done(published ? "Published. The podcast is now on the website." : "Unpublished. The podcast is hidden from the website.");
  if (published) redirect("/admin/content/podcasts");
}

export async function deletePodcast(id: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: gone } = await supabase.from("podcasts").delete().eq("id", id).select("audio_path").maybeSingle();
  if (gone?.audio_path) await supabase.storage.from(AUDIO_BUCKET).remove([gone.audio_path]);
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

// ---------------------------------------------------------------------------
// Photos sent by hosts (waiting in the private gallery-submissions bucket)
// ---------------------------------------------------------------------------

// Approve: copy the photo into the public gallery (at the end), with the
// caption the admin settled on, then remove the private copy.
export async function approveGalleryPhoto(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const caption = text(formData, "caption");
  const error = tooLong(caption, 200, "The caption");
  if (error) return { error };
  const supabase = await createClient();
  const { data: sub } = await supabase.from("gallery_submissions").select("id, status, image_path").eq("id", id).maybeSingle();
  if (!sub || sub.status !== "pending" || !sub.image_path) {
    await done("This photo has already been reviewed.");
    return {};
  }

  const { data: file, error: downloadError } = await supabase.storage.from(PHOTO_BUCKET).download(sub.image_path);
  if (downloadError || !file) return { error: "The photo couldn't be found. Please try again." };
  const ext = sub.image_path.split(".").pop() ?? "jpg";
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const path = newImagePath(IMAGE_TARGETS.gallery.folder, type);
  const { error: uploadError } = await supabase.storage.from("gallery").upload(path, file, { contentType: type });
  if (uploadError) return { error: "The photo couldn't be added to the gallery. Please try again." };

  const { data: last } = await supabase.from("gallery_images").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data: image, error: insertError } = await supabase
    .from("gallery_images")
    .insert({ image_path: path, caption: caption || null, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (insertError || !image) {
    await supabase.storage.from("gallery").remove([path]);
    return { error: "The photo couldn't be added to the gallery. Please try again." };
  }
  await supabase
    .from("gallery_submissions")
    .update({ status: "approved", decided_at: new Date().toISOString(), image_path: null, caption: caption || null, gallery_image_id: image.id })
    .eq("id", id);
  await supabase.storage.from(PHOTO_BUCKET).remove([sub.image_path]);
  await done("Approved. The photo is now in the gallery.");
  return {};
}

// Decline: delete the photo; the row stays as a record for the host page.
export async function declineGalleryPhoto(id: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: sub } = await supabase.from("gallery_submissions").select("status, image_path").eq("id", id).maybeSingle();
  if (!sub || sub.status !== "pending") {
    await done("This photo has already been reviewed.");
    return {};
  }
  const { error } = await supabase
    .from("gallery_submissions")
    .update({ status: "declined", decided_at: new Date().toISOString(), image_path: null })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: "The photo couldn't be declined. Please try again." };
  if (sub.image_path) await supabase.storage.from(PHOTO_BUCKET).remove([sub.image_path]);
  await done("Declined. The photo has been deleted.");
  return {};
}
