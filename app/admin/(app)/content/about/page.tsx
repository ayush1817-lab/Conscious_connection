import type { Metadata } from "next";
import { PageSections } from "@/components/content/page-sections";

export const metadata: Metadata = { title: "About page · Website content · Conscious Connections" };

export default function ContentPage() {
  return <PageSections page="about" />;
}
