import type { Metadata } from "next";
import { ItemRow, Thumb } from "@/components/content/item-list";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stories · Website content · Conscious Connections" };

export default async function StoriesPage() {
  const supabase = await createClient();
  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, cover_path, published, published_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
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
