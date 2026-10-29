import { GalleryStrip, LatestPodcast, LatestStories, UpcomingEventsList } from "@/components/public/home-blocks";
import { HomeEvents, HomeGallery, HomeHero, HomeHost, HomeIntro, HomePhotos, HomePodcast, HomeRibbon, HomeStories } from "@/components/public/home-view";
import { getHomeData } from "@/lib/public/home";

// P1 Homepage: the admin's sections (Website content > Homepage), the next 3
// events, latest stories, latest podcast and a gallery strip.
export default async function HomePage() {
  const { sections: s, events, places, stories, podcast, media, gallery } = await getHomeData();

  return (
    <>
      <HomeHero s={s} />
      <HomeRibbon s={s} />
      <HomeIntro s={s} />
      <HomePhotos s={s} />
      <HomeEvents s={s}>
        <UpcomingEventsList events={events} places={places} />
      </HomeEvents>
      <HomeHost s={s} />
      {stories.length ? (
        <HomeStories s={s}>
          <LatestStories stories={stories} />
        </HomeStories>
      ) : null}
      {podcast && media ? (
        <HomePodcast s={s}>
          <LatestPodcast podcast={podcast} media={media} />
        </HomePodcast>
      ) : null}
      {gallery.length ? (
        <HomeGallery s={s}>
          <GalleryStrip gallery={gallery} />
        </HomeGallery>
      ) : null}
    </>
  );
}
