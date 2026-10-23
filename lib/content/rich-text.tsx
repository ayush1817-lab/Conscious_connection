import { Fragment, type ReactNode } from "react";

// The "basic formatting" the admin can use in content text:
// a blank line starts a new paragraph, **bold** and *italic*.
// With `blocks` (longer page text such as About), a line starting "## " is a
// sub-heading, lines starting "* " or "- " are bullet points, and email
// addresses and web links become links. Stories leave it off, so a poem's
// lines are never turned into a list.
// Rendered as React elements, so no HTML from the text is ever trusted.
export function RichText({
  text,
  className = "",
  blocks = false,
  headingLevel = 2,
}: {
  text: string;
  className?: string;
  blocks?: boolean;
  // Sub-headings ("## ") become <h2> by default; <h3> under a page section.
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const lineText = (line: string) => (blocks ? linked(line) : inline(line));
  const lines = (ls: string[]) =>
    ls.map((line, j) => (
      <Fragment key={j}>
        {j > 0 ? <br /> : null}
        {lineText(line)}
      </Fragment>
    ));

  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.flatMap((p, i) => {
        if (!blocks) return [<p key={i}>{lines(p.split("\n"))}</p>];
        return splitBlocks(p).map((block, k) => {
          const key = `${i}-${k}`;
          if (block.kind === "heading")
            return (
              <Heading key={key} className={`rich-heading pt-2 font-heading text-xl font-semibold text-text ${headingLevel === 2 ? "md:text-2xl" : ""}`}>
                {lineText(block.text)}
              </Heading>
            );
          if (block.kind === "list")
            return (
              <ul key={key} className="rich-list list-disc space-y-2 pl-6">
                {block.items.map((item, n) => (
                  <li key={n}>{lineText(item)}</li>
                ))}
              </ul>
            );
          return <p key={key}>{lines(block.lines)}</p>;
        });
      })}
    </div>
  );
}

type Block = { kind: "heading"; text: string } | { kind: "list"; items: string[] } | { kind: "text"; lines: string[] };

const BULLET = /^[*-]\s+/;

// One paragraph can hold a heading line, a run of bullets and plain lines.
function splitBlocks(paragraph: string): Block[] {
  const out: Block[] = [];
  for (const raw of paragraph.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const last = out[out.length - 1];
    if (line.startsWith("## ")) out.push({ kind: "heading", text: line.slice(3).trim() });
    else if (BULLET.test(line)) {
      const item = line.replace(BULLET, "");
      if (last?.kind === "list") last.items.push(item);
      else out.push({ kind: "list", items: [item] });
    } else if (last?.kind === "text") last.lines.push(line);
    else out.push({ kind: "text", lines: [line] });
  }
  return out;
}

const LINK = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

// Bold/italic, then email addresses and http(s) links as links.
function linked(line: string): ReactNode[] {
  return inline(line).flatMap((part, i) => {
    if (typeof part !== "string") return [part];
    const out: ReactNode[] = [];
    let last = 0;
    for (const m of part.matchAll(LINK)) {
      if (m.index > last) out.push(part.slice(last, m.index));
      const href = m[1] ? `mailto:${m[1]}` : m[2];
      out.push(
        <a key={`${i}-${m.index}`} href={href} className="font-medium text-primary underline underline-offset-4" {...(m[2] ? { rel: "noopener noreferrer" } : {})}>
          {m[0]}
        </a>,
      );
      last = m.index + m[0].length;
    }
    if (last < part.length) out.push(part.slice(last));
    return out;
  });
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
