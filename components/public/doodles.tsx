// Hand-drawn "sticker" doodles scattered around sections (sparkles, hearts,
// squiggles...). Purely decorative: hidden from screen readers, ignore clicks,
// and drawn only in the theme colours via the .doodle classes in globals.css.

export type DoodleName = "sparkle" | "heart" | "squiggle" | "star" | "bubble" | "wave" | "dots" | "loop" | "flower";

const PATHS: Record<DoodleName, React.ReactNode> = {
  sparkle: <path className="d-fill" d="M20 2c1.6 9 4.6 12.4 16 18-11.4 5.6-14.4 9-16 18-1.6-9-4.6-12.4-16-18C15.4 14.4 18.4 11 20 2z" />,
  heart: <path className="d-fill" d="M20 35C8 26 3 19.5 3 13.2 3 7.9 7 4 12 4c3.6 0 6.3 2 8 5 1.7-3 4.4-5 8-5 5 0 9 3.9 9 9.2C37 19.5 32 26 20 35z" />,
  squiggle: <path className="d-line" d="M3 24c5-10 9-10 12 0s7 10 11 0 8-10 11 0" />,
  star: <path className="d-fill" d="m20 3 4.6 10.6L36 15l-8.6 7.6L30 34l-10-6-10 6 2.6-11.4L4 15l11.4-1.4z" />,
  bubble: (
    <>
      <path className="d-fill" d="M6 6h28a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H17l-8 7v-7H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" />
      <circle className="d-ink" cx="13" cy="16.5" r="2" />
      <circle className="d-ink" cx="20" cy="16.5" r="2" />
      <circle className="d-ink" cx="27" cy="16.5" r="2" />
    </>
  ),
  wave: <path className="d-line" d="M2 14c4.5-5 8.5-5 13 0s8.5 5 13 0 7-5 10-2M2 26c4.5-5 8.5-5 13 0s8.5 5 13 0 7-5 10-2" />,
  dots: (
    <>
      {[6, 16, 26, 36].flatMap((x) => [6, 16, 26, 36].map((y) => <circle key={`${x}-${y}`} className="d-fill" cx={x} cy={y} r="2" />))}
    </>
  ),
  loop: <path className="d-line" d="M3 30c8 6 18 2 20-6 2-7-5-10-8-5-4 7 5 14 15 12 4-1 6-3 8-6" />,
  flower: (
    <>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} className="d-fill" cx="20" cy="10" rx="6" ry="9" transform={`rotate(${r} 20 20)`} />
      ))}
      <circle className="d-ink" cx="20" cy="20" r="4.5" />
    </>
  ),
};

export function Doodle({
  name,
  className = "",
  tone = "orchid",
  style,
}: {
  name: DoodleName;
  className?: string;
  // Fill colour: lilac and orchid are soft; primary stands out.
  tone?: "lilac" | "orchid" | "primary";
  style?: React.CSSProperties;
}) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 40 40" className={`doodle doodle-${tone} ${className}`} style={style}>
      {PATHS[name]}
    </svg>
  );
}

// A moving ribbon of the kinds of things people host, between sections.
// The words are repeated so the loop is seamless; screen readers get them once.
export function Ribbon({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="ribbon-row" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={i}>
          <span>{item}</span>
          <Doodle name={i % 2 ? "heart" : "sparkle"} tone="lilac" className="ribbon-mark" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="ribbon" role="region" aria-label="The kinds of events our community hosts">
      <div className="ribbon-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
