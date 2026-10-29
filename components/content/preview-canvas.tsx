"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AboutView } from "@/components/public/about-view";
import { BackgroundWaves } from "@/components/public/background-waves";
import { GuidelinesView } from "@/components/public/guidelines-view";
import { HomeEvents, HomeGallery, HomeHero, HomeHost, HomeIntro, HomePhotos, HomePodcast, HomeRibbon, HomeStories } from "@/components/public/home-view";
import type { IllustrationName } from "@/components/public/illustrations";
import { PageIntro } from "@/components/public/section-heading";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { PAGE_AREAS, withDefaults, type ContentPage, type RawSection, type SectionValues } from "@/lib/content/sections";

// Runs inside the content editor's preview frame (/admin/preview/<page>).
// Shows the real website page built from the same components as the site,
// and redraws it with the editor's unsaved text as it arrives by postMessage.
// Every editable part carries data-area, so it can be numbered, highlighted
// and clicked to open its editor.

export type PreviewMessage = { type: "cc-preview"; rows: Record<string, RawSection>; active: string | null; zoom: number };

type Slots = { events: React.ReactNode; stories: React.ReactNode; podcast: React.ReactNode; gallery: React.ReactNode };

// The other pages: what sits under each page's title.
const PAGES: Record<string, { width: string; illustration?: IllustrationName; guidelines?: string; below: string }> = {
  events: { width: "max-w-6xl", illustration: "map", below: "The event filters and the list of live events appear here, from Events." },
  stories: { width: "max-w-6xl", illustration: "story", below: "Published stories and poems appear here, from Stories." },
  share_story: { width: "max-w-3xl", guidelines: "guidelines for stories and poetry", below: "The form for sharing a story or poem appears here." },
  podcasts: { width: "max-w-4xl", illustration: "podcast", below: "Published podcast episodes appear here, from Podcasts." },
  gallery: { width: "max-w-6xl", illustration: "camera", below: "Gallery photos appear here, from Gallery." },
  submit_event: { width: "max-w-6xl", illustration: "host", guidelines: "guidelines for events", below: "The “How it works” steps and the form for hosting an event appear here." },
};

function Auto({ children }: { children: React.ReactNode }) {
  return <p className="preview-auto">{children}</p>;
}

export function PreviewCanvas({
  page,
  initial,
  footer,
  slots,
}: {
  page: ContentPage;
  initial: Record<string, SectionValues>;
  footer?: string;
  slots?: Slots;
}) {
  const [rows, setRows] = useState<Record<string, RawSection> | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  // Other pages: the page whose title is being edited (the first until one is picked).
  const [shown, setShown] = useState("events");
  const rootRef = useRef<HTMLDivElement>(null);
  const areas = PAGE_AREAS[page];
  const s = rows ? withDefaults(page, Object.entries(rows).map(([key, r]) => ({ ...r, key }))) : initial;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "cc-preview") return;
      const data = event.data as PreviewMessage;
      setRows(data.rows);
      setActive(data.active);
      setZoom(data.zoom);
      if (page === "pages" && data.active && PAGES[data.active]) setShown(data.active);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "cc-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [page]);

  // Number every editable part, and mark the one being edited.
  useLayoutEffect(() => {
    rootRef.current?.querySelectorAll<HTMLElement>("[data-area]").forEach((el) => {
      const i = areas.findIndex((a) => a.key === el.dataset.area);
      if (i < 0) return;
      el.classList.add("preview-area");
      el.classList.toggle("is-active", el.dataset.area === active);
      el.dataset.areaNum = String(i + 1);
      el.dataset.areaLabel = `${i + 1}  ${areas[i].title}`;
    });
  });

  // Bring the part being edited into view.
  useEffect(() => {
    if (!active) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-area="${active}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: el.offsetHeight > window.innerHeight * 0.8 ? "start" : "center" });
    // Also after the preview size changes (Computer / Phone), which reflows the page.
  }, [active, shown, zoom]);

  function pick(event: React.MouseEvent) {
    const area = (event.target as Element).closest<HTMLElement>("[data-area]")?.dataset.area;
    if (area) window.parent.postMessage({ type: "cc-pick", area }, window.location.origin);
  }

  let content: React.ReactNode;
  if (page === "home") {
    content = (
      <>
        <div data-area="banner">
          <HomeHero s={s} />
        </div>
        <div data-area="ribbon">
          <HomeRibbon s={s} />
        </div>
        <div data-area="intro">
          <HomeIntro s={s} />
        </div>
        <div data-area="photos">
          <HomePhotos s={s} />
        </div>
        <div data-area="events">
          <HomeEvents s={s}>{slots?.events}</HomeEvents>
        </div>
        <div data-area="host">
          <HomeHost s={s} />
        </div>
        <div data-area="stories">
          <HomeStories s={s}>{slots?.stories ?? <Auto>Hidden on the website until a story or poem is published.</Auto>}</HomeStories>
        </div>
        <div data-area="podcast">
          <HomePodcast s={s}>{slots?.podcast ?? <Auto>Hidden on the website until a podcast is published.</Auto>}</HomePodcast>
        </div>
        <div data-area="gallery">
          <HomeGallery s={s}>{slots?.gallery ?? <Auto>Hidden on the website until the gallery has photos.</Auto>}</HomeGallery>
        </div>
      </>
    );
  } else if (page === "about") {
    content = <AboutView sections={s} />;
  } else if (page === "guidelines") {
    content = <GuidelinesView sections={s} />;
  } else {
    const meta = PAGES[shown];
    const intro = s[shown];
    content = (
      <div className={`mx-auto ${meta.width} px-4 py-10`}>
        <div data-area={shown}>
          <PageIntro title={intro.heading} intro={intro.body} eyebrow={s[`${shown}_eyebrow`]?.heading} illustration={meta.illustration}>
            {meta.guidelines ? (
              <p>
                Please read our{" "}
                <Link href="/guidelines" className="font-medium text-primary underline underline-offset-4">
                  {meta.guidelines}
                </Link>{" "}
                before you {shown === "submit_event" ? "submit" : "share"}.
              </p>
            ) : null}
          </PageIntro>
        </div>
        <Auto>{meta.below}</Auto>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      onClick={pick}
      className={`public-site site-preview flex min-h-screen flex-col ${active ? "has-active" : ""}`}
      style={{ "--preview-zoom": zoom } as React.CSSProperties}
    >
      <SiteHeader />
      <main className="flex-1">
        <BackgroundWaves />
        {content}
      </main>
      <div data-area={page === "home" ? "footer" : undefined}>
        <SiteFooter description={page === "home" ? s.footer.heading : footer} />
      </div>
    </div>
  );
}
