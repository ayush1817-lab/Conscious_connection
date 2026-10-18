import { SectionEditor } from "@/components/content/section-editor";
import { PAGE_SECTIONS, type ContentPage } from "@/lib/content/sections";
import { createClient } from "@/lib/supabase/server";
import { saveSection } from "@/app/admin/(app)/content/actions";

// A8 Homepage / About / Other pages: one editor per section, in page order. Any section that
// doesn't have a row yet (e.g. a new database) is created from the built-in
// wording first, so there is always something to edit.
export async function PageSections({ page }: { page: ContentPage }) {
  const supabase = await createClient();
  const defs = PAGE_SECTIONS[page];
  const load = () =>
    supabase.from("site_sections").select("id, key, heading, body, image_path, image_alt, updated_at").eq("page", page);

  const { data } = await load();
  let rows = data ?? [];
  const missing = defs.filter((d) => !rows.some((r) => r.key === d.key));
  if (missing.length) {
    // Use the rows the insert returns: a second identical read in the same
    // request would be served from Next.js's fetch memo, without them.
    const { data: added } = await supabase
      .from("site_sections")
      .upsert(
        missing.map((d) => ({ page, key: d.key, heading: d.defaults.heading, body: d.defaults.body, sort_order: defs.indexOf(d) + 1 })),
        { onConflict: "page,key", ignoreDuplicates: true },
      )
      .select("id, key, heading, body, image_path, image_alt, updated_at");
    rows = [...rows, ...(added ?? [])];
  }

  return (
    <div className="space-y-6">
      {defs.map((def) => {
        const row = rows.find((r) => r.key === def.key);
        if (!row) return null;
        return (
          <SectionEditor
            // Remount after a save so the form starts from the saved values.
            key={`${row.id}-${row.updated_at}`}
            def={def}
            section={row}
            action={saveSection.bind(null, row.id)}
          />
        );
      })}
    </div>
  );
}
