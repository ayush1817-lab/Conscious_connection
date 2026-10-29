import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewCanvas } from "@/components/content/preview-canvas";
import { GalleryStrip, LatestPodcast, LatestStories, UpcomingEventsList } from "@/components/public/home-blocks";
import { requireAdmin } from "@/lib/auth/admin";
import { PAGE_SECTIONS, type ContentPage } from "@/lib/content/sections";
import { getFooterText, getSections } from "@/lib/public/content";
import { getHomeData } from "@/lib/public/home";

export const metadata: Metadata = { title: "Website preview · Conscious Connections" };

// The page shown inside the content editor's preview frame: the real website
// page, which the editor updates as you type (see PreviewCanvas). The lists
// that fill themselves (events, stories...) are the real ones.
export default async function PreviewPage({ params }: { params: Promise<{ page: string }> }) {
  await requireAdmin();
  const { page } = await params;
  if (!(page in PAGE_SECTIONS)) notFound();
  const contentPage = page as ContentPage;

  if (contentPage === "home") {
    const { sections, events, places, stories, podcast, media, gallery } = await getHomeData();
    return (
      <PreviewCanvas
        page="home"
        initial={sections}
        slots={{
          events: <UpcomingEventsList events={events} places={places} />,
          stories: stories.length ? <LatestStories stories={stories} /> : null,
          podcast: podcast && media ? <LatestPodcast podcast={podcast} media={media} /> : null,
          gallery: gallery.length ? <GalleryStrip gallery={gallery} /> : null,
        }}
      />
    );
  }

  const [sections, footer] = await Promise.all([getSections(contentPage), getFooterText()]);
  return <PreviewCanvas page={contentPage} initial={sections} footer={footer} />;
}
