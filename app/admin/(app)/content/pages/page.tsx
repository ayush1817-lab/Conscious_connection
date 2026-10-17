import type { Metadata } from "next";
import { PageSections } from "@/components/content/page-sections";

export const metadata: Metadata = { title: "Other pages · Website content · Conscious Connections" };

// Titles and introductions of the Events, Stories, Podcasts, Gallery and form pages.
export default function ContentPage() {
  return <PageSections page="pages" />;
}
