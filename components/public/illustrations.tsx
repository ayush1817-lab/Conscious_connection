// Spot illustrations in the brand's line style: violet ink lines over soft
// lilac and orchid fills, with a pale blob behind. Decorative only.
// Colours come from the .illo classes in globals.css (i-a lilac, i-b orchid,
// i-c pale lilac, i-w white, i-p violet), never raw colours.

export type IllustrationName =
  | "gathering"
  | "safe-space"
  | "community"
  | "map"
  | "story"
  | "podcast"
  | "camera"
  | "host"
  | "hearts"
  | "guidelines";

const Blob = () => <path className="i-c i-ns" d="M28 70c-6-26 14-50 46-54s58 8 62 34-8 48-40 54-62-8-68-34z" />;

const ART: Record<IllustrationName, React.ReactNode> = {
  // Two cups clinking, with steam and a heart.
  gathering: (
    <>
      <Blob />
      <g transform="rotate(-12 58 72)">
        <path className="i-a" d="M40 52h36l-4 40a7 7 0 0 1-7 6H51a7 7 0 0 1-7-6z" />
        <path d="M76 60c11 0 11 18-1 18" />
        <path d="M46 64h26" />
      </g>
      <g transform="rotate(12 104 72)">
        <path className="i-b" d="M86 52h36l-4 40a7 7 0 0 1-7 6H97a7 7 0 0 1-7-6z" />
        <path d="M86 60c-11 0-11 18 1 18" />
        <path d="M92 64h26" />
      </g>
      <path d="M58 40c-4-5 4-8 0-14M72 38c-4-5 4-8 0-14" />
      <path className="i-p i-ns" d="M90 34c-6-4.5-8.5-7.8-8.5-11 0-2.7 2-4.6 4.5-4.6 1.8 0 3.1 1 4 2.5.9-1.5 2.2-2.5 4-2.5 2.5 0 4.5 1.9 4.5 4.6 0 3.2-2.5 6.5-8.5 11z" />
      <path d="M118 30l4-4M124 40h6M112 22v-6" />
    </>
  ),
  // An open doorway with a heart: a safe place to walk into.
  "safe-space": (
    <>
      <Blob />
      <path className="i-a" d="M50 104V62a30 30 0 0 1 60 0v42z" />
      <path className="i-w" d="M62 104V64a18 18 0 0 1 36 0v40z" />
      <path className="i-p i-ns" d="M80 90c-9-6.8-12.8-11.7-12.8-16.5 0-4 3-7 6.8-7 2.7 0 4.7 1.5 6 3.8 1.3-2.3 3.3-3.8 6-3.8 3.8 0 6.8 3 6.8 7 0 4.8-3.8 9.7-12.8 16.5z" />
      <path d="M36 104h88" />
      <path d="M34 50l-6-4M126 50l6-4M80 18v-8" />
      <circle className="i-b" cx="120" cy="88" r="7" />
      <circle className="i-a" cx="40" cy="86" r="5" />
    </>
  ),
  // Three linked loops, like the logo, held by little figures.
  community: (
    <>
      <Blob />
      <circle className="i-a" cx="50" cy="56" r="11" />
      <path className="i-a" d="M32 100c0-14 8-24 18-24s18 10 18 24" />
      <circle className="i-b" cx="80" cy="48" r="12" />
      <path className="i-b" d="M60 100c0-16 9-27 20-27s20 11 20 27" />
      <circle className="i-a" cx="110" cy="56" r="11" />
      <path className="i-a" d="M92 100c0-14 8-24 18-24s18 10 18 24" />
      <path d="M44 26c8-8 20-8 26 0M90 26c6-8 18-8 26 0" />
      <path d="M24 100h112" />
    </>
  ),
  // A loose island shape with pins dropped across it.
  map: (
    <>
      <path className="i-a" d="M62 18c10-4 20 2 26 0s14-6 18 2-2 14 4 20 14 8 10 18-14 8-14 18 6 18-4 24-20 0-28 4-20 6-26-2 4-14-4-20-18-4-18-14 10-14 8-22-8-14-2-22 14-6 10-6z" />
      <path className="i-ns" style={{ fill: "none", strokeDasharray: "3 7" }} d="M58 46c14 4 20 20 34 16s12-20 22-14" />
      {[
        [58, 42],
        [92, 60],
        [70, 86],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <path className="i-p" d={`M${x} ${y + 16}c-8-9-12-15-12-21a12 12 0 0 1 24 0c0 6-4 12-12 21z`} />
          <circle className="i-w i-ns" cx={x} cy={y - 5} r="4.5" />
        </g>
      ))}
      <path className="i-b" d="M114 40l4-10 4 10 10 4-10 4-4 10-4-10-10-4z" />
    </>
  ),
  // An open notebook and a pen.
  story: (
    <>
      <Blob />
      <path className="i-w" d="M80 36c-12-8-30-10-46-6v64c16-4 34-2 46 6z" />
      <path className="i-a" d="M80 36c12-8 30-10 46-6v64c-16-4-34-2-46 6z" />
      <path d="M80 36v64" />
      <path d="M44 46c10-2 20-1 28 2M44 58c10-2 20-1 28 2M44 70c8-2 16-1 22 1" />
      <path className="i-p i-ns" d="M103 74c-7-5.2-9.8-9-9.8-12.6 0-3 2.3-5.3 5.2-5.3 2 0 3.6 1.1 4.6 2.9 1-1.8 2.6-2.9 4.6-2.9 2.9 0 5.2 2.3 5.2 5.3 0 3.6-2.8 7.4-9.8 12.6z" />
      <path className="i-b" d="M118 12l14 14-40 40-18 4 4-18z" />
      <path d="M78 52l14 14" />
    </>
  ),
  // A studio microphone with sound waves.
  podcast: (
    <>
      <Blob />
      <rect className="i-a" x="64" y="16" width="32" height="56" rx="16" />
      <path d="M64 36h12M64 48h12M84 36h12M84 48h12" />
      <path d="M54 54c0 16 12 28 26 28s26-12 26-28M80 82v18M64 102h32" />
      <path d="M38 34c-6 8-6 22 0 30M28 26c-10 13-10 33 0 46M122 34c6 8 6 22 0 30M132 26c10 13 10 33 0 46" />
      <circle className="i-b" cx="80" cy="28" r="3" />
    </>
  ),
  // An instant camera with a photo sliding out.
  camera: (
    <>
      <Blob />
      <path className="i-w" d="M58 78h44v34H58z" transform="rotate(-6 80 95)" />
      <path className="i-b i-ns" d="M63 82h34v20H63z" transform="rotate(-6 80 95)" />
      <rect className="i-a" x="34" y="30" width="92" height="56" rx="12" />
      <circle className="i-w" cx="80" cy="58" r="18" />
      <circle className="i-b" cx="80" cy="58" r="9" />
      <rect className="i-p i-ns" x="44" y="38" width="14" height="8" rx="3" />
      <circle className="i-w" cx="114" cy="42" r="4" />
      <path d="M120 16l4 8M132 22l-6 6M136 34h-8" />
    </>
  ),
  // A megaphone with little hearts coming out.
  host: (
    <>
      <Blob />
      <path className="i-a" d="M40 56l56-26v68L40 72z" />
      <rect className="i-b" x="26" y="54" width="16" height="20" rx="5" />
      <path d="M52 76l6 24h12l-4-20" />
      <path d="M108 50c6 4 6 16 0 20M118 42c10 8 10 28 0 36" />
      <path className="i-p i-ns" d="M128 34c-5-3.7-7-6.5-7-9.2 0-2.2 1.7-3.9 3.8-3.9 1.5 0 2.6.8 3.2 2.1.6-1.3 1.7-2.1 3.2-2.1 2.1 0 3.8 1.7 3.8 3.9 0 2.7-2 5.5-7 9.2z" />
    </>
  ),
  // Two overlapping hearts tied with a loop.
  hearts: (
    <>
      <Blob />
      <path className="i-a" d="M64 98C40 80 30 67 30 54c0-10 8-18 18-18 7 0 12 4 16 10 4-6 9-10 16-10 10 0 18 8 18 18 0 13-10 26-34 44z" />
      <path className="i-b" d="M100 92c-18-13.5-25-23-25-33 0-7.5 6-13.5 13.5-13.5 5.2 0 9 3 11.5 7.5 2.5-4.5 6.3-7.5 11.5-7.5 7.5 0 13.5 6 13.5 13.5 0 10-7 19.5-25 33z" />
      <path d="M30 108c20 8 38-4 34-16-3-8-14-4-10 4 6 12 36 14 64 0" />
    </>
  ),
  // A clipboard with ticks.
  guidelines: (
    <>
      <Blob />
      <rect className="i-w" x="46" y="22" width="68" height="84" rx="8" />
      <rect className="i-a" x="64" y="16" width="32" height="14" rx="5" />
      {[48, 66, 84].map((y) => (
        <g key={y}>
          <path className="i-b" d={`M56 ${y - 6}h12v12H56z`} />
          <path d={`M58 ${y}l3 3 6-7M76 ${y}h28`} />
        </g>
      ))}
    </>
  ),
};

export function Illustration({ name, className = "" }: { name: IllustrationName; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 160 120" className={`illo ${className}`}>
      {ART[name]}
    </svg>
  );
}
