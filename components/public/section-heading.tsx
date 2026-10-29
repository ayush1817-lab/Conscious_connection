import { RichText } from "@/lib/content/rich-text";
import Link from "next/link";
import { Doodle } from "./doodles";
import { ArrowRightIcon } from "./icons";
import { Illustration, type IllustrationName } from "./illustrations";

// A small label above a heading ("What's on", "From the community").
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`eyebrow ${className}`}>
      <Doodle name="sparkle" tone="primary" className="eyebrow-mark" />
      {children}
    </p>
  );
}

// "Upcoming events ............ View all events →"
export function SectionHeading({
  id,
  title,
  link,
  eyebrow,
}: {
  id: string;
  title: string;
  link?: { href: string; label: string };
  eyebrow?: string;
}) {
  return (
    <div className="section-heading mb-5 flex flex-wrap items-end justify-between gap-2">
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 id={id} className="font-heading text-2xl font-semibold md:text-3xl">
          {title}
        </h2>
      </div>
      {link ? (
        <Link href={link.href} className="section-link inline-flex min-h-tap items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
          {link.label}
          <ArrowRightIcon size={18} />
        </Link>
      ) : null}
    </div>
  );
}

// `intro` is admin-written text (Website content > Other pages); `children` is fixed wording.
// `illustration` adds the page's spot drawing on the right.
export function PageIntro({
  title,
  intro,
  children,
  eyebrow,
  illustration,
}: {
  title: string;
  intro?: string;
  children?: React.ReactNode;
  eyebrow?: string;
  illustration?: IllustrationName;
}) {
  return (
    <div className={`page-intro mb-8 ${illustration ? "page-intro-illustrated" : "max-w-2xl"}`}>
      <div className="page-intro-copy max-w-2xl">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="font-heading text-3xl font-semibold md:text-4xl">{title}</h1>
        {intro ? <RichText text={intro} className="mt-3 text-lg text-muted" /> : null}
        {children ? <div className="mt-3 text-lg text-muted">{children}</div> : null}
      </div>
      {illustration ? (
        <div className="page-intro-art">
          <Illustration name={illustration} />
          <Doodle name="sparkle" tone="orchid" className="page-intro-spark" />
          <Doodle name="dots" tone="lilac" className="page-intro-dots" />
        </div>
      ) : null}
    </div>
  );
}
