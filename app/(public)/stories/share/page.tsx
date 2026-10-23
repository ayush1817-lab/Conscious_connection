import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/public/section-heading";
import { StoryForm } from "@/components/public/story-form";
import { getPageIntro } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "Share your story",
  description: "Share your experience with the Conscious Connections community.",
};

export default async function ShareStoryPage() {
  const intro = await getPageIntro("share_story");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageIntro title={intro.heading} intro={intro.body}>
        <p>
          Please read our{" "}
          <Link href="/guidelines#stories" className="font-medium text-primary underline underline-offset-4">
            guidelines for stories and poetry
          </Link>{" "}
          before you share.
        </p>
      </PageIntro>
      <StoryForm />
    </div>
  );
}
