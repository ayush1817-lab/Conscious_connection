import Image from "next/image";
import { formatShortDate } from "@/lib/format";
import { publicImageUrl } from "@/lib/storage";
import { Doodle } from "./doodles";

// The event's poster, or a branded placeholder showing the county and date
// (spec section 5), so there is never a broken image.
export function EventPoster({
  event,
  sizes,
  className = "",
  preload = false,
}: {
  event: { poster_path: string | null; county: string; start_at: string; title: string };
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  return (
    <div className={`event-poster relative aspect-[4/3] overflow-hidden bg-hero ${className}`}>
      {event.poster_path ? (
        <Image
          src={publicImageUrl("posters", event.poster_path)}
          alt={`Poster for ${event.title}`}
          fill
          sizes={sizes}
          preload={preload}
          className="object-cover"
        />
      ) : (
        <PosterPlaceholder county={event.county} startAt={event.start_at} />
      )}
    </div>
  );
}

export function PosterPlaceholder({ county, startAt }: { county: string; startAt: string }) {
  return (
    <div
      aria-hidden
      className="poster-placeholder flex h-full w-full flex-col items-center justify-center gap-1 p-4 text-center"
    >
      <Doodle name="loop" tone="primary" className="poster-doodle poster-doodle-loop" />
      <Doodle name="sparkle" tone="orchid" className="poster-doodle poster-doodle-spark" />
      <Doodle name="heart" tone="lilac" className="poster-doodle poster-doodle-heart" />
      <span className="poster-date rounded-full bg-surface px-3 py-1 text-sm font-medium text-text">{formatShortDate(startAt)}</span>
      <span className="poster-county font-heading font-semibold text-primary">{county}</span>
      <span className="mt-1 text-xs tracking-wide text-text uppercase">Conscious Connections</span>
    </div>
  );
}
