import { publicImageUrl } from "@/lib/storage";

// Event poster, or a crossed-box placeholder like the wireframes when there is none.
export function PosterThumb({ path, className = "h-16 w-16" }: { path: string | null; className?: string }) {
  if (path) {
    // eslint-disable-next-line @next/next/no-img-element -- small thumbnails from Supabase Storage
    return <img src={publicImageUrl("posters", path)} alt="" className={`${className} shrink-0 rounded-control object-cover`} />;
  }
  return (
    <div aria-hidden className={`${className} shrink-0 overflow-hidden rounded-control border border-border bg-background`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full text-border">
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
