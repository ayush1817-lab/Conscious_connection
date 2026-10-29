import type { Metadata } from "next";
import { GuidelinesView } from "@/components/public/guidelines-view";
import { getSections } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: "Guidelines for hosting and attending events, and for sharing stories and poetry with Conscious Connections.",
};

export default async function GuidelinesPage() {
  return <GuidelinesView sections={await getSections("guidelines")} />;
}
