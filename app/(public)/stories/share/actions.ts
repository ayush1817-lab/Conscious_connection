"use server";

import { notifyAdmins } from "@/lib/email/admin-recipients";
import { newStorySubmissionEmail, sendEmail, sendQuietly, storyReceivedEmail } from "@/lib/email";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/content/images";
import { adminStorySubmissionUrl } from "@/lib/links";
import { excerpt } from "@/lib/public/content";
import { isLikelyBot, RATE_LIMITED_MESSAGE, withinRateLimit } from "@/lib/public/spam";
import { STORY_IMAGE_FOLDER, STORY_LIMITS, isStoryImagePath } from "@/lib/public/story-form";
import { checkEmail, checkText, field, type FieldErrors } from "@/lib/public/validate";
import { revalidatePublicSite } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";

export type StoryValues = { title: string; body: string; author_name: string; anonymous: boolean; email: string; image_path: string; consent: boolean };
export type StoryState = { error?: string; fieldErrors?: FieldErrors; values?: StoryValues; done?: boolean };

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Signed upload URL for the optional story image (same approach as event posters).
export async function createStoryImageUpload(type: string, size: number): Promise<{ path: string; token: string } | { error: string }> {
  if (!(IMAGE_TYPES as readonly string[]).includes(type)) return { error: "Images must be a JPG, PNG or WebP." };
  if (!(size > 0) || size > IMAGE_MAX_BYTES) return { error: `Images can be up to 5MB (this one is ${(size / 1024 / 1024).toFixed(1)}MB).` };
  if (!(await withinRateLimit("storyImageUpload"))) return { error: RATE_LIMITED_MESSAGE };
  const path = `${STORY_IMAGE_FOLDER}/${crypto.randomUUID()}.${EXTENSIONS[type]}`;
  const { data, error } = await createAdminClient().storage.from("content").createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl (story) failed", error);
    return { error: "The image couldn't be uploaded. Please try again." };
  }
  return { path, token: data.token };
}

// "Share your story": saved as a pending submission for the team to review.
export async function submitStory(_prev: StoryState, formData: FormData): Promise<StoryState> {
  const values: StoryValues = {
    title: field(formData, "title"),
    body: field(formData, "body"),
    author_name: field(formData, "author_name"),
    anonymous: formData.get("anonymous") === "yes",
    email: field(formData, "email").toLowerCase(),
    image_path: field(formData, "image_path"),
    consent: formData.get("consent") === "yes",
  };
  if (isLikelyBot(formData)) return { done: true };

  const fieldErrors: FieldErrors = {};
  const set = (key: string, message: string | null) => {
    if (message) fieldErrors[key] = message;
  };
  set("title", checkText(values.title, "a title", STORY_LIMITS.title));
  set("body", checkText(values.body, "your story", STORY_LIMITS.body));
  if (!fieldErrors.body && values.body.length < STORY_LIMITS.bodyMin) fieldErrors.body = `Please write at least ${STORY_LIMITS.bodyMin} characters.`;
  if (!values.anonymous) set("author_name", checkText(values.author_name, "your name", STORY_LIMITS.name, false));
  set("email", checkEmail(values.email));
  if (values.image_path && !isStoryImagePath(values.image_path)) {
    fieldErrors.image_path = "That image couldn't be used. Please add it again.";
    values.image_path = "";
  }
  if (!values.consent) fieldErrors.consent = "Please tick the box to agree, so we can review and publish your story.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  if (!(await withinRateLimit("story"))) return { error: RATE_LIMITED_MESSAGE, values };

  const db = createAdminClient();
  if (values.image_path) {
    const { data: exists } = await db.storage.from("content").exists(values.image_path);
    if (!exists) return { fieldErrors: { image_path: "That image didn't finish uploading. Please add it again." }, values: { ...values, image_path: "" } };
  }

  const name = values.anonymous ? null : values.author_name || null;
  const { data: saved, error } = await db
    .from("story_submissions")
    .insert({ title: values.title, body: values.body, author_name: name, email: values.email, image_path: values.image_path || null })
    .select("id")
    .single();
  if (error || !saved) {
    console.error("story submission failed", error);
    return { error: "Something went wrong and your story wasn't sent. Please try again.", values };
  }

  await sendQuietly("story submitted", () =>
    Promise.all([
      sendEmail(values.email, storyReceivedEmail({ name, title: values.title })),
      notifyAdmins(newStorySubmissionEmail({ title: values.title, name, excerpt: excerpt(values.body, 300), adminUrl: adminStorySubmissionUrl(saved.id) })),
    ]),
  );
  revalidatePublicSite(); // the admin's review queue
  return { done: true };
}
