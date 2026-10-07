/**
 * npm run test:content  (milestone 6 acceptance)
 *
 * Needs the app running. Re-seeds the database first. Adds, edits, publishes,
 * deletes and reorders each content type through the admin (A8), including
 * image uploads to Storage, the unsaved-changes warning, the YouTube preview,
 * and checks the pages fit a 360px phone.
 */
import { execSync } from "node:child_process";
import type { Page } from "playwright-core";
import { env, serviceClient } from "../lib/env";
import { placeholderPng } from "../lib/placeholder-png";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();

function png(name: string, colour = "#4F7A65") {
  return { name, mimeType: "image/png", buffer: placeholderPng(64, 48, colour) };
}

async function visible(page: Pick<Page, "getByText">, text: string | RegExp, timeout = 5000) {
  return page
    .getByText(text)
    .first()
    .waitFor({ timeout })
    .then(() => true, () => false);
}

async function stored(bucket: string, path: string) {
  const folder = path.split("/").slice(0, -1).join("/");
  const { data } = await service.storage.from(bucket).list(folder, { limit: 1000 });
  return !!data?.some((f) => `${folder}/${f.name}` === path);
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const browser = await launch();

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await page.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await page.getByRole("button", { name: "Log in" }).click();
    await page.getByRole("heading", { name: /Welcome/ }).waitFor();

    console.log("Homepage");
    await page.getByRole("link", { name: /Website content/ }).click();
    await page.waitForURL(`${BASE_URL}/admin/content/homepage`);
    const banner = page.getByRole("region", { name: "Top banner" });
    await banner.getByLabel("Heading").fill("Find your people");
    check(await banner.getByRole("heading", { name: "Find your people" }).isVisible(), "preview updates as you type");
    check(await banner.getByText("You have unsaved changes.").isVisible(), "shows unsaved changes");

    let asked = "";
    page.once("dialog", (d) => {
      asked = d.message();
      void d.dismiss();
    });
    await page.getByRole("link", { name: "Stories" }).click();
    await page.waitForTimeout(500);
    check(asked.includes("unsaved changes") && page.url().endsWith("/homepage"), "warns before leaving with unsaved changes");

    await banner.getByLabel("Image").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
    check(await visible(banner, `"notes.txt" isn't a JPG, PNG or WebP image.`), "refuses a file that isn't an image");
    await banner.getByLabel("Image").setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: Buffer.alloc(6 * 1024 * 1024) });
    check(await visible(banner, `"huge.png" is 6.0MB. Images can be up to 5MB.`), "refuses an image over 5MB");
    await banner.getByLabel("Image").setInputFiles(png("banner.png"));
    await banner.getByRole("button", { name: "Change image" }).waitFor();
    await banner.getByRole("button", { name: "Save" }).click();
    check(await visible(page, "Saved. Your changes are live."), "save shows a confirmation");
    const { data: hero } = await service.from("site_sections").select("heading, image_path").eq("key", "hero").single();
    check(hero?.heading === "Find your people", "heading is saved");
    check(!!hero?.image_path && (await stored("content", hero.image_path)), "image is uploaded to Storage and saved");
    check(!(await banner.getByText("You have unsaved changes.").isVisible()), "no unsaved changes after saving");

    console.log("\nAbout");
    await page.getByRole("link", { name: "About" }).click();
    const about = page.getByRole("region", { name: "About Conscious Connections" });
    await about.getByLabel("Text").fill("We are **small** and *friendly*.\n\nSecond paragraph.");
    check((await about.locator("strong", { hasText: "small" }).count()) === 1 && (await about.locator("em", { hasText: "friendly" }).count()) === 1, "bold and italic show in the preview");
    await about.getByRole("button", { name: "Save" }).click();
    // The homepage's toast may still be showing, so wait for the form to be clean instead.
    check(await about.getByText("You have unsaved changes.").waitFor({ state: "hidden" }).then(() => true, () => false), "about page saves");
    const { data: aboutRow } = await service.from("site_sections").select("body").eq("key", "about").single();
    check(aboutRow?.body === "We are **small** and *friendly*.\n\nSecond paragraph.", "text is saved with plain line breaks", JSON.stringify(aboutRow?.body));

    console.log("\nStories");
    await page.getByRole("link", { name: "Stories" }).click();
    await page.waitForURL(`${BASE_URL}/admin/content/stories`);
    await page.getByRole("link", { name: "+ Add new story" }).click();
    await page.getByRole("button", { name: "Save draft" }).waitFor();
    await page.getByLabel("Story").fill("Some words first.");
    await page.getByRole("button", { name: "Save draft" }).click();
    check(await visible(page, "Please add a title."), "a story needs a title");
    await page.getByLabel("Title").fill("Walking into winter");
    await page.getByLabel("Cover image").setInputFiles(png("cover.png", "#C4A484"));
    await page.getByRole("button", { name: "Change image" }).waitFor();
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.waitForURL(/\/admin\/content\/stories\/[0-9a-f-]{36}$/);
    check(await visible(page, "Story saved as a draft."), "new story is saved as a draft");
    const { data: story } = await service.from("stories").select("*").eq("title", "Walking into winter").single();
    check(story?.slug === "walking-into-winter" && !story.published && !!story.cover_path, "draft has a slug and cover image");

    await page.getByRole("button", { name: "Publish" }).click();
    check(await visible(page, "Published. The story is now on the website."), "publish confirms");
    const { data: published } = await service.from("stories").select("published, published_at").eq("id", story!.id).single();
    check(!!published?.published && !!published.published_at, "story is published");
    await page.getByRole("button", { name: "Unpublish" }).click();
    check(await visible(page, "Unpublished."), "unpublish confirms");

    await page.getByLabel("Title").fill("Walking into winter together");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    check(await visible(page, "Saved. This story is still a draft."), "editing a draft says it's still a draft");

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog", { name: "Delete this story?" }).getByRole("button", { name: "Yes, delete it" }).click();
    await page.waitForURL(`${BASE_URL}/admin/content/stories`);
    check(await visible(page, "Story deleted."), "delete confirms");
    check(!(await page.content()).includes("Walking into winter"), "story is gone from the list");
    check(!(await stored("content", story!.cover_path!)), "its cover image is removed from Storage");

    console.log("\nPodcasts");
    await page.getByRole("link", { name: "Podcasts" }).click();
    await page.getByRole("link", { name: "+ Add new podcast" }).click();
    await page.getByLabel("Title").fill("Episode 6: Winter walks");
    await page.getByLabel("YouTube link").fill("https://example.com/video");
    check(await visible(page, "That doesn't look like a YouTube video link."), "a non-YouTube link is flagged straight away");
    await page.getByRole("button", { name: "Save draft" }).click();
    check(await visible(page, /That doesn't look like a YouTube video link/), "and refused on save");
    await page.getByLabel("YouTube link").fill("https://youtu.be/aqz-KE-bpKQ?si=abc");
    const src = await page.locator("iframe").getAttribute("src");
    check(src === "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ", "pasting a link shows the video preview", src ?? "");
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.waitForURL(/\/admin\/content\/podcasts\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Publish" }).click();
    check(await visible(page, "Published. The podcast is now on the website."), "podcast publishes");
    const { data: podcast } = await service.from("podcasts").select("id, published").eq("title", "Episode 6: Winter walks").single();
    check(!!podcast?.published, "podcast is published");
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog", { name: "Delete this podcast?" }).getByRole("button", { name: "Yes, delete it" }).click();
    await page.waitForURL(`${BASE_URL}/admin/content/podcasts`);
    const { count: podcastsLeft } = await service.from("podcasts").select("id", { count: "exact", head: true }).eq("id", podcast!.id);
    check(podcastsLeft === 0, "podcast deletes");

    console.log("\nGallery");
    await page.getByRole("link", { name: "Gallery" }).click();
    await page.locator("#gallery-upload").setInputFiles([png("one.png", "#A3B8A8"), png("two.png", "#D9CBB3"), { name: "bad.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") }]);
    check(await visible(page, "2 images added. They're now in the gallery.", 10000), "uploads several images at once");
    check(await visible(page, `"bad.gif" isn't a JPG, PNG or WebP image.`), "lists the file that wasn't added");
    const order = async () => (await service.from("gallery_images").select("id, image_path, caption").order("sort_order")).data!;
    const before = await order();
    check(before.length === 8, "gallery now has 8 images", String(before.length));

    await page.getByLabel("Caption").first().fill("Sunrise at Fanore");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    check(await visible(page, "Caption saved."), "caption saves");
    check((await order())[0].caption === "Sunrise at Fanore", "caption is stored");

    await page.getByRole("button", { name: "Move image 8 earlier" }).click();
    check(await visible(page, "Moved earlier."), "move confirms");
    const moved = await order();
    check(moved[6].id === before[7].id && moved[7].id === before[6].id, "the last image moves up one place");
    check(await page.getByRole("button", { name: "Move image 1 earlier" }).isDisabled(), "the first image can't move earlier");

    await page.getByRole("button", { name: "Delete" }).last().click();
    await page.getByRole("dialog", { name: "Delete this image?" }).getByRole("button", { name: "Yes, delete it" }).click();
    check(await visible(page, "Image deleted from the gallery."), "delete confirms");
    const after = await order();
    check(after.length === 7 && !after.some((i) => i.id === moved[7].id), "image is removed");
    check(!(await stored("gallery", moved[7].image_path)), "its file is removed from Storage");

    console.log("\nMobile (360px)");
    const phone = await context.newPage();
    await phone.setViewportSize({ width: 360, height: 780 });
    for (const tab of ["homepage", "stories", "stories/new", "podcasts/new", "gallery", "about"]) {
      await phone.goto(`${BASE_URL}/admin/content/${tab}`);
      await phone.getByRole("heading", { name: "Website content" }).waitFor();
      const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(overflow <= 0, `${tab} has no sideways scrolling at 360px`, `${overflow}px too wide`);
    }
    if (process.env.E2E_SCREENSHOT_DIR) {
      const dir = process.env.E2E_SCREENSHOT_DIR;
      await page.setViewportSize({ width: 1280, height: 900 });
      for (const tab of ["homepage", "stories", "podcasts", "gallery"]) {
        await page.goto(`${BASE_URL}/admin/content/${tab}`);
        await page.getByRole("heading", { name: "Website content" }).waitFor();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${dir}/a8-${tab}.png`, fullPage: true });
      }
      await phone.goto(`${BASE_URL}/admin/content/gallery`);
      await phone.screenshot({ path: `${dir}/a8-gallery-mobile.png`, fullPage: true });
    }
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
