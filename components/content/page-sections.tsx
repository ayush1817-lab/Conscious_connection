import { PageEditor, type Draft } from "@/components/content/page-editor";
import { PAGE_AREAS, PAGE_SECTIONS, type ContentPage } from "@/lib/content/sections";
import { createClient } from "@/lib/supabase/server";

// Where each page's "Open the live page" link goes. Other pages: one per part.
const LIVE: Record<ContentPage, string | Record<string, string>> = {
  home: "/",
  about: "/about",
  guidelines: "/guidelines",
  pages: { events: "/events", stories: "/stories", share_story: "/stories/share", podcasts: "/podcasts", gallery: "/gallery", submit_event: "/submit-event" },
};

// A8 Homepage / About / Other pages / Guidelines: the page's parts, each with
// its own Save, beside a live preview of the page. Any section that doesn't
// have a row yet (e.g. a new database, or one added since) is created from the
// built-in wording first, so there is always something to edit.
export async function PageSections({ page }: { page: ContentPage }) {
  const supabase = await createClient();
  const defs = PAGE_SECTIONS[page];
  const columns = "id, key, heading, body, image_path, image_alt";

  const { data } = await supabase.from("site_sections").select(columns).eq("page", page);
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
      .select(columns);
    rows = [...rows, ...(added ?? [])];
  }

  // Empty fields show the built-in wording, as the website does.
  const initial: Record<string, Draft> = {};
  for (const def of defs) {
    const row = rows.find((r) => r.key === def.key);
    if (!row) continue;
    initial[def.key] = {
      heading: row.heading?.trim() ? row.heading : def.defaults.heading,
      body: row.body?.trim() ? row.body : def.defaults.body,
      image_path: row.image_path,
      image_alt: row.image_alt ?? "",
    };
  }
  const areas = PAGE_AREAS[page]
    .map((area) => ({ ...area, defs: area.rows.map((key) => defs.find((d) => d.key === key)!).filter((d) => initial[d.key]) }))
    .filter((area) => area.defs.length);

  return <PageEditor page={page} areas={areas} initial={initial} live={LIVE[page]} />;
}
