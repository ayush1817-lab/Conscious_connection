import type { Metadata } from "next";
import { PageIntro } from "@/components/public/section-heading";
import { StoryForm } from "@/components/public/story-form";

export const metadata: Metadata = {
  title: "Share your story",
  description: "Share your experience with the Conscious Connections community.",
};

export default function ShareStoryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageIntro title="Share your story">
        Your experience could help someone feel less alone. Tell us about finding community, moving somewhere new, or anything
        you&apos;d like others to hear.
      </PageIntro>
      <StoryForm />
    </div>
  );
}
