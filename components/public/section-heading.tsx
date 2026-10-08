import Link from "next/link";
import { ArrowRightIcon } from "./icons";

// "Upcoming events ............ View all events →"
export function SectionHeading({ id, title, link }: { id: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
      <h2 id={id} className="font-heading text-2xl font-semibold md:text-3xl">
        {title}
      </h2>
      {link ? (
        <Link href={link.href} className="inline-flex min-h-tap items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
          {link.label}
          <ArrowRightIcon size={18} />
        </Link>
      ) : null}
    </div>
  );
}

export function PageIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h1 className="font-heading text-3xl font-semibold md:text-4xl">{title}</h1>
      {children ? <div className="mt-3 text-lg text-muted">{children}</div> : null}
    </div>
  );
}
