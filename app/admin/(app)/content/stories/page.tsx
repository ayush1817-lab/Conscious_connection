import type { Metadata } from "next";
import Link from "next/link";
import { ItemRow, Thumb } from "@/components/content/item-list";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, timeAgo } from "@/lib/format";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stories · Website content · Conscious Connections" };

export default async function StoriesPage() {
  const supabase = await createClient();
  const [{ data: stories }, { data: submissions }] = await Promise.all([
    supabase.from("stories").select("id, title, cover_path, published, published_at, created_at, author_name").order("created_at", { ascending: false }),
    supabase.from("story_submissions").select("id, title, author_name, created_at, image_path").eq("status", "pending").order("created_at"),
  ]);

  return (
    <div className="space-y-4">
      {submissions?.length ? (
        <section aria-labelledby="shared-heading" className="space-y-2">
          <h2 id="shared-heading" className="text-lg font-semibold">
            Shared by the community, waiting for review ({submissions.length})
          </h2>
          <ul className="divide-y divide-border rounded-card border-2 border-primary bg-surface px-4">
            {submissions.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/content/stories/submissions/${s.id}`} className="group flex min-h-tap items-center gap-3 py-3">
                  <Thumb src={s.image_path ? publicImageUrl("content", s.image_path) : null} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium group-hover:underline">{s.title}</span>
                      <Badge tone="new">New</Badge>
                    </span>
                    <span className="block text-sm text-muted">
                      {s.author_name ?? "Anonymous"} · shared {timeAgo(s.created_at)}
                    </span>
                  </span>
                  <span aria-hidden className="text-xl text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ButtonLink href="/admin/content/stories/new">+ Add new story</ButtonLink>
      {stories?.length ? (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface px-4">
          {stories.map((s) => (
            <ItemRow
              key={s.id}
              href={`/admin/content/stories/${s.id}`}
              title={s.title}
              published={s.published}
              date={s.published && s.published_at ? formatDate(s.published_at) : null}
              detail={s.author_name ? `By ${s.author_name}` : undefined}
              thumb={<Thumb src={s.cover_path ? publicImageUrl("content", s.cover_path) : null} />}
            />
          ))}
        </ul>
      ) : (
        <EmptyState>No stories yet. Add the first one.</EmptyState>
      )}
    </div>
  );
}
