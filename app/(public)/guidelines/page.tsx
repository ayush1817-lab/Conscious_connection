import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/public/section-heading";
import { RichText } from "@/lib/content/rich-text";
import { getSections } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: "Guidelines for hosting and attending events, and for sharing stories and poetry with Conscious Connections.",
};

// Written by the team in Website content > Guidelines. Each part has its own
// link (/guidelines#events, /guidelines#stories) for the forms to point to.
export default async function GuidelinesPage() {
  const sections = await getSections("guidelines");
  const parts = [sections.events, sections.stories];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageIntro title={sections.intro.heading} intro={sections.intro.body} eyebrow="Look after each other" illustration="guidelines" />
      <nav aria-label="On this page" className="mb-8">
        <ul className="flex flex-wrap gap-3">
          {parts.map((part) => (
            <li key={part.key}>
              <a href={`#${part.key}`} className="inline-flex min-h-tap items-center rounded-full bg-band px-4 font-medium hover:underline">
                {part.heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-10">
        {parts.map((part) => (
          <section key={part.key} id={part.key} aria-labelledby={`${part.key}-heading`} className="scroll-mt-24 rounded-card border border-border bg-surface p-5 md:p-6">
            <h2 id={`${part.key}-heading`} className="font-heading text-2xl font-semibold md:text-3xl">
              {part.heading}
            </h2>
            {part.body ? (
              <RichText text={part.body} blocks headingLevel={3} className="mt-4 text-lg" />
            ) : (
              <p className="mt-3 text-lg text-muted">These guidelines are coming soon.</p>
            )}
          </section>
        ))}
      </div>
      <p className="mt-10 text-muted">
        Questions about these guidelines? See the{" "}
        <Link href="/about" className="font-medium text-primary underline underline-offset-4">
          About page
        </Link>{" "}
        for how to contact us.
      </p>
    </div>
  );
}
