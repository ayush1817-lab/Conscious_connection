"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { sendEmail, storyDeclinedEmail, storyPublishedEmail } from "@/lib/email";
import { slugify } from "@/lib/content/slug";
import { setFlash } from "@/lib/flash";
import { publicStoryUrl } from "@/lib/links";
import { revalidatePublicSite } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

async function uniqueSlug(supabase: Client, title: string) {
  const base = slugify(title);
  const { data } = await supabase.from("stories").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((s) => s.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// Approve: publish the submission as a story, email the writer (S3), then open
// the story so the admin can tidy it up if needed.
export async function approveStorySubmission(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: sub } = await supabase.from("story_submissions").select("*").eq("id", id).maybeSingle();
  if (!sub || sub.status !== "pending") {
    await setFlash("This story has already been reviewed.", "error");
    revalidatePublicSite();
    redirect("/admin/content/stories");
  }

  const now = new Date().toISOString();
  const slug = await uniqueSlug(supabase, sub.title);
  const { data: story, error } = await supabase
    .from("stories")
    .insert({ title: sub.title, body: sub.body, cover_path: sub.image_path, author_name: sub.author_name, slug, published: true, published_at: now })
    .select("id, slug")
    .single();
  if (error || !story) {
    console.error("approveStorySubmission failed", error);
    await setFlash("The story couldn't be published. Please try again.", "error");
    revalidatePublicSite();
    redirect(`/admin/content/stories/submissions/${id}`);
  }
  // Only moves on if nobody reviewed it meanwhile.
  await supabase.from("story_submissions").update({ status: "approved", decided_at: now, story_id: story.id }).eq("id", id).eq("status", "pending");

  const sent = sub.email ? await sendEmail(sub.email, storyPublishedEmail({ name: sub.author_name, title: sub.title, storyUrl: publicStoryUrl(story.slug) })) : null;
  await setFlash(
    sent?.ok
      ? "Published. The story is now on the website, and the writer has been emailed."
      : `Published. The story is now on the website${sent ? `, but the email to ${sub.email} couldn't be sent` : ""}.`,
    sent && !sent.ok ? "error" : "success",
  );
  revalidatePublicSite();
  redirect(`/admin/content/stories/${story.id}`);
}

// Decline with a reason, which is emailed to the writer (S4).
export async function declineStorySubmission(id: string, _prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Please write a reason. It will be emailed to the writer." };
  if (reason.length > 1000) return { error: "Please keep the reason under 1000 characters." };
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("story_submissions")
    .update({ status: "declined", decided_at: new Date().toISOString(), decision_reason: reason })
    .eq("id", id)
    .eq("status", "pending")
    .select("title, author_name, email")
    .maybeSingle();
  if (!sub) return { error: "This story has already been reviewed. Please reload the page." };

  const sent = sub.email ? await sendEmail(sub.email, storyDeclinedEmail({ name: sub.author_name, title: sub.title, reason })) : null;
  await setFlash(
    sent?.ok ? "Story declined. The writer has been emailed." : `Story declined.${sent ? ` But the email to ${sub.email} couldn't be sent.` : ""}`,
    sent && !sent.ok ? "error" : "success",
  );
  revalidatePublicSite();
  redirect("/admin/content/stories");
}
