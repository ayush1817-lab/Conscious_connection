import type { Metadata } from "next";
import { SectionEditor } from "@/components/content/section-editor";
import { EmptyState } from "@/components/ui/empty-state";
import { SECTION_TITLES } from "@/lib/content/sections";
import { createClient } from "@/lib/supabase/server";
import { saveSection } from "../actions";

export const metadata: Metadata = { title: "About page · Website content · Conscious Connections" };

export default async function AboutpageContentPage() {
  const supabase = await createClient();
  const { data: sections } = await supabase
    .from("site_sections")
    .select("id, key, heading, body, image_path, updated_at")
    .eq("page", "about")
    .order("sort_order");

  if (!sections?.length) return <EmptyState>There are no sections to edit yet.</EmptyState>;
  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <SectionEditor
          // Remount after a save so the form starts from the saved values.
          key={`${s.id}-${s.updated_at}`}
          title={SECTION_TITLES[s.key] ?? s.heading}
          section={s}
          action={saveSection.bind(null, s.id)}
        />
      ))}
    </div>
  );
}
