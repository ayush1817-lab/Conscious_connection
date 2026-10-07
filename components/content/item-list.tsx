import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// A row in the Stories / Podcasts lists.
export function ItemRow({
  href,
  title,
  published,
  date,
  detail,
  thumb,
}: {
  href: string;
  title: string;
  published: boolean;
  date: string | null;
  detail?: string;
  thumb: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="group flex min-h-tap items-center gap-3 py-3">
        {thumb}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium group-hover:underline">{title}</span>
            <Badge tone={published ? "success" : "muted"}>{published ? "Published" : "Draft"}</Badge>
          </span>
          {date ? <span className="block text-sm text-muted">Published {date}</span> : null}
          {detail ? <span className="block truncate text-sm text-muted">{detail}</span> : null}
        </span>
        <span aria-hidden className="text-xl text-muted">›</span>
      </Link>
    </li>
  );
}

export function Thumb({ src, label }: { src: string | null; label?: string }) {
  return (
    <span className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-background">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs text-muted">{label ?? "No image"}</span>
      )}
    </span>
  );
}
