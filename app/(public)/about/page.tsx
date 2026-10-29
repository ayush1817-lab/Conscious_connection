import type { Metadata } from "next";
import { AboutView } from "@/components/public/about-view";
import { getSections } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "About",
  description: "Conscious Connections is a community for LGBTQ+ women and non-binary people across the island of Ireland.",
};

export default async function AboutPage() {
  return <AboutView sections={await getSections("about")} />;
}
