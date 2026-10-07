import { Fragment, type ReactNode } from "react";

// The "basic formatting" Karina can use in content text:
// a blank line starts a new paragraph, **bold** and *italic*.
// Rendered as React elements, so no HTML from the text is ever trusted.
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((p, i) => (
        <p key={i}>
          {p.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 ? <br /> : null}
              {inline(line)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

function inline(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    parts.push(match[1] !== undefined ? <strong key={match.index}>{match[1]}</strong> : <em key={match.index}>{match[2]}</em>);
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}
