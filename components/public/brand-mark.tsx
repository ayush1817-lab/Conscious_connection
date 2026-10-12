// Decorative connection loops: the text beside the mark remains the link's accessible name.
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" className={`brand-mark ${className}`}>
      <ellipse cx="24" cy="24" rx="10" ry="21" transform="rotate(28 24 24)" />
      <ellipse cx="24" cy="24" rx="10" ry="21" transform="rotate(88 24 24)" />
      <ellipse cx="24" cy="24" rx="10" ry="21" transform="rotate(148 24 24)" />
    </svg>
  );
}

export function ConnectionLoops({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 110" fill="none" className={`connection-loops ${className}`}>
      <path d="M4 75c38 36 96 14 112-27 12-32-19-47-34-21-19 35 24 71 76 66 31-3 53-19 77-43" />
    </svg>
  );
}
