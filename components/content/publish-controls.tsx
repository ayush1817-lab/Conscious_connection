import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";

// Publish/Unpublish for a story or podcast. Plain form, so it works before JS
// loads; the button shows "Publishing…" and can't be pressed twice. Publishing
// goes back to the list with a confirmation toast.
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
          <SubmitButton
            pendingLabel={published ? "Unpublishing…" : "Publishing…"}
            className={buttonClass(published ? "secondary" : "primary", "w-full sm:w-auto")}
          >
            {published ? "Unpublish" : "Publish"}
          </SubmitButton>
        </form>
        {children}
      </div>
    </div>
  );
}
