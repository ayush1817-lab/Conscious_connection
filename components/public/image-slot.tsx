import Image from "next/image";
import { BRAND_IMAGES, SHOW_PLACEHOLDERS, type BrandImageSlot } from "@/lib/brand-images";
import { Doodle } from "./doodles";

// A labelled stand-in for a photo that hasn't been supplied yet: says which
// photo goes here and at what size. `where` says how to add it (admin slots).
export function PhotoPlaceholder({
  label,
  suggestion,
  size,
  where,
  className = "",
}: {
  label: string;
  suggestion: string;
  size?: string;
  where?: string;
  className?: string;
}) {
  if (!SHOW_PLACEHOLDERS) return null;
  return (
    <div className={`photo-placeholder ${className}`} role="img" aria-label={`Photo coming soon: ${suggestion}`}>
      <Doodle name="sparkle" tone="orchid" className="photo-placeholder-spark" />
      <svg aria-hidden="true" viewBox="0 0 24 24" className="photo-placeholder-icon">
        <rect x="3" y="6" width="18" height="14" rx="3" />
        <circle cx="12" cy="13" r="3.5" />
        <path d="M8.5 6l1.5-2.5h4L15.5 6" />
      </svg>
      <span className="photo-placeholder-label">{label}</span>
      <span className="photo-placeholder-text">{suggestion}</span>
      {size ? <span className="photo-placeholder-size">{size}</span> : null}
      {where ? <span className="photo-placeholder-size">{where}</span> : null}
    </div>
  );
}

// A design photo slot: the photo once it's in public/images/brand/, otherwise its placeholder.
export function BrandPhoto({ slot, className = "", sizes }: { slot: BrandImageSlot; className?: string; sizes: string }) {
  const img = BRAND_IMAGES[slot];
  if (img.file) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={`/images/brand/${img.file}`} alt={img.alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  return <PhotoPlaceholder label={img.label} suggestion={img.suggestion} size={img.size} className={className} />;
}
