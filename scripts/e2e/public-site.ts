/**
 * npm run test:public
 *
 * Needs the app running. Re-seeds the database first. Checks the public website:
 * every page loads on desktop and at 360px with no sideways scrolling and no
 * accessibility problems (axe), admin edits show up straight away, and
 * unpublished content never appears.
 */
import { execSync } from "node:child_process";
import { serviceClient } from "../lib/env";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const { data: story } = await service.from("stories").select("slug").eq("published", true).limit(1).single();
  if (!story) throw new Error("Seed data has no published story.");

  const pages = ["/", "/about", "/privacy", "/stories", `/stories/${story.slug}`, "/podcasts", "/gallery"];

  const browser = await launch();
  try {
    for (const [label, viewport] of [
      ["desktop", { width: 1280, height: 900 }],
      ["360px", { width: 360, height: 800 }],
    ] as const) {
      console.log(`\nEvery page (${label})`);
      const page = await browser.newPage({ viewport });
      for (const path of pages) {
        const res = await page.goto(`${BASE_URL}${path}`);
        check(res?.status() === 200, `${path} loads`, `status ${res?.status()}`);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        check(scrollWidth <= viewport.width, `${path} has no sideways scrolling`, `${scrollWidth}px wide`);
        await axe(page, `${path} (${label})`);
      }
      const missing = await page.goto(`${BASE_URL}/no-such-page`);
      check(missing?.status() === 404, "an unknown address returns 404");
      check(await page.getByRole("link", { name: "Find events" }).first().isVisible(), "the 404 page links to events");
      await axe(page, `404 (${label})`);

      if (label === "360px") {
        await page.goto(`${BASE_URL}/`);
        await page.getByRole("button", { name: "Open menu" }).click();
        await page.locator("#mobile-menu").getByRole("link", { name: "Stories" }).click();
        await page.waitForURL(`${BASE_URL}/stories`);
        check(true, "the mobile menu opens and navigates");
        check(!(await page.locator("#mobile-menu").isVisible()), "the mobile menu closes after navigating");
      }
      await page.close();
    }

    console.log("\nFreshness and publishing");
    const page = await browser.newPage();
    const heading = `Fresh from the admin ${Date.now()}`;
    await service.from("site_sections").update({ heading }).eq("page", "home").eq("key", "hero");
    await page.goto(`${BASE_URL}/`);
    check(await page.getByRole("heading", { name: heading }).isVisible(), "a homepage edit shows straight away");

    const draft = { title: `Draft story ${Date.now()}`, slug: `draft-${Date.now()}`, body: "Not yet.", published: false };
    await service.from("stories").insert(draft);
    await page.goto(`${BASE_URL}/stories`);
    check(!(await page.getByText(draft.title).isVisible()), "draft stories aren't listed");
    const draftPage = await page.goto(`${BASE_URL}/stories/${draft.slug}`);
    check(draftPage?.status() === 404, "draft stories can't be opened");

    const html = await (await fetch(`${BASE_URL}/`)).text();
    check(!html.includes("noindex"), "the homepage can be indexed by search engines");
    check(html.includes('property="og:title"') || html.includes("og:site_name"), "the homepage has share preview tags");
  } finally {
    await browser.close();
  }
  execSync("npm run seed", { stdio: "ignore" });
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
