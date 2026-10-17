import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReasonDialog } from "@/components/events/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { RichText } from "@/lib/content/rich-text";
import { formatDateTime, timeAgo } from "@/lib/format";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { approveStorySubmission, declineStorySubmission } from "../actions";

export const metadata: Metadata = { title: "Shared story · Website content · Conscious Connections" };

// Review a story someone shared from the public site: approve (publish) or decline.
export default async function StorySubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: sub } = await supabase.from("story_submissions").select("*, stories(slug)").eq("id", id).maybeSingle();
  if (!sub) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/content/stories" className="inline-flex min-h-tap items-center text-primary underline-offset-4 hover:underline">
        ‹ All stories
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-semibold">{sub.title}</h2>
        {sub.status === "pending" ? <Badge tone="new">Waiting for review</Badge> : sub.status === "approved" ? <Badge tone="success">Published</Badge> : <Badge tone="muted">Declined</Badge>}
      </div>

      <dl className="grid gap-2 rounded-card border border-border bg-surface p-4 sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted">Shared</dt>
        <dd>
          {timeAgo(sub.created_at)} ({formatDateTime(sub.created_at)})
        </dd>
        <dt className="text-muted">Name shown</dt>
        <dd>{sub.author_name ?? "Anonymous"}</dd>
        <dt className="text-muted">Email (private)</dt>
        <dd>{sub.email ? <a href={`mailto:${sub.email}`} className="text-primary underline underline-offset-4">{sub.email}</a> : <span className="text-muted">Removed after 30 days</span>}</dd>
        {sub.decided_at ? (
          <>
            <dt className="text-muted">Reviewed</dt>
            <dd>{formatDateTime(sub.decided_at)}</dd>
          </>
        ) : null}
        {sub.decision_reason ? (
          <>
            <dt className="text-muted">Reason given</dt>
            <dd>{sub.decision_reason}</dd>
          </>
        ) : null}
      </dl>

      {sub.status === "pending" ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={approveStorySubmission.bind(null, sub.id)}>
            <SubmitButton pendingLabel="Publishing…" className={buttonClass("primary", "w-full sm:w-auto sm:min-w-40")}>
              Approve and publish
            </SubmitButton>
          </form>
          <ReasonDialog
            trigger="Decline"
            title="Decline this story"
            submitLabel="Send and decline"
            hostName={sub.author_name ?? "the writer"}
            hostEmail={sub.email ?? "no email"}
            audience="the writer"
            action={declineStorySubmission.bind(null, sub.id)}
            variant="danger"
          />
        </div>
      ) : sub.stories ? (
        <p className="flex flex-wrap gap-3">
          <Link href={`/admin/content/stories/${sub.story_id}`} className={buttonClass("primary")}>
            Edit the published story
          </Link>
          <a href={`/stories/${sub.stories.slug}`} className={buttonClass("secondary")}>
            View on website
          </a>
        </p>
      ) : null}

      <article className="space-y-4 rounded-card border border-border bg-surface p-4 md:p-6">
        {sub.image_path ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-control bg-band">
            <Image src={publicImageUrl("content", sub.image_path)} alt="The photo shared with this story" fill sizes="(min-width: 1152px) 1100px, 100vw" className="object-cover" />
          </div>
        ) : null}
        <RichText text={sub.body} className="text-lg" />
      </article>
      <p className="text-sm text-muted">Approving publishes the story as it is. You can edit it straight afterwards.</p>
    </div>
  );
}
