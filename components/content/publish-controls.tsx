import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

// Publish/Unpublish for a story or podcast. Plain form, so it works before JS loads.
export function PublishControls({
  published,
  publishedAt,
  toggle,
  kind,
  children,
}: {
  published: boolean;
  publishedAt: string | null;
  toggle: () => Promise<void>;
  kind: "story" | "podcast";
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex flex-wrap items-center gap-2">
        <Badge tone={published ? "success" : "muted"}>{published ? "Published" : "Draft"}</Badge>
        <span className="text-muted">
          {published
            ? `On the website${publishedAt ? ` since ${formatDate(publishedAt)}` : ""}.`
            : `This ${kind} isn't on the website.`}
        </span>
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={toggle}>
          <Button type="submit" variant={published ? "secondary" : "primary"} className="w-full sm:w-auto">
            {published ? "Unpublish" : "Publish"}
          </Button>
        </form>
        {children}
      </div>
    </div>
  );
}
