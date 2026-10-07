import type { Metadata } from "next";
import Link from "next/link";
import { PodcastEditor } from "@/components/content/podcast-editor";
import { createPodcast } from "../../actions";

export const metadata: Metadata = { title: "New podcast · Website content · Conscious Connections" };

export default function NewPodcastPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/content/podcasts" className="inline-flex min-h-tap items-center text-primary underline-offset-4 hover:underline">
        ‹ All podcasts
      </Link>
      <h2 className="text-xl font-semibold">New podcast</h2>
      <p className="text-muted">It&apos;s saved as a draft first. Nothing appears on the website until you publish it.</p>
      <PodcastEditor action={createPodcast} saveLabel="Save draft" />
    </div>
  );
}
