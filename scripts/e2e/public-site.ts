/**
 * npm run test:public
 *
 * Needs the app running. Re-seeds the database first. Checks the public website:
 * every page loads on desktop and at 360px with no sideways scrolling and no
 * accessibility problems (axe), admin edits show up straight away, and
 * unpublished content never appears. Events: only live upcoming events are
 * listed, filters work, hidden events return 404, places left are right, share
 * previews are set, and no private detail (address, host, registrants) appears.
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

  const { data: liveEvent } = await service.from("events").select("id").eq("title", "Pottery Taster Evening").single();
  if (!liveEvent) throw new Error("Seed data is missing Pottery Taster Evening.");

  const pages = [
    "/",
    "/about",
    "/privacy",
    "/stories",
    `/stories/${story.slug}`,
    "/podcasts",
    "/gallery",
    "/events",
    "/events?county=carlow",
    `/events/${liveEvent.id}`,
  ];

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

    await checkEvents();

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

async function html(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.text() };
}

async function checkEvents() {
  console.log("\nEvents");
  const now = new Date().toISOString();
  const { data: all } = await service
    .from("events")
    .select("id, title, status, end_at, event_private_details(exact_address, host_name, host_email, host_phone, emergency_contact_name), registrations(name, email)");
  const events = all ?? [];
  const visible = events.filter((e) => e.status === "live" && e.end_at > now);
  const hidden = events.filter((e) => !(e.status === "live" && e.end_at > now));

  const list = await html("/events");
  check(visible.every((e) => list.body.includes(e.title.replace(/&/g, "&amp;"))), "the list shows every live upcoming event");
  check(hidden.every((e) => !list.body.includes(`/events/${e.id}`)), "the list shows no pending, declined, cancelled, taken-down or ended events");
  check(list.body.includes(`${visible.length} events found`), "the list counts the events found");

  const clare = await html("/events?county=clare");
  const notClare = visible.filter((e) => !["Sunrise Meditation", "Pottery Taster Evening"].includes(e.title));
  check(clare.body.includes("Sunrise Meditation") && notClare.every((e) => !clare.body.includes(`/events/${e.id}`)), "the county filter shows only that county");
  const carlow = await html("/events?county=carlow");
  check(carlow.body.includes("No events in Co. Carlow yet.") && carlow.body.includes('href="/submit-event"'), "an empty county invites people to host");

  const full = visible.find((e) => e.title === "Sea Swim & Sauna");
  const oneLeft = visible.find((e) => e.title === "Pottery Taster Evening");
  check(list.body.includes("Event full") && list.body.includes("1 place left"), "cards show Event full and 1 place left");
  const fullPage = await html(`/events/${full?.id}`);
  check(fullPage.status === 200 && fullPage.body.includes("Event full"), "a full event says so");
  const plenty = await html(`/events/${visible.find((e) => e.title === "Sunrise Meditation")?.id}`);
  check(!plenty.body.includes(">Places<"), "events with plenty of room don't show places left");

  for (const e of hidden) {
    const page = await html(`/events/${e.id}`);
    check(page.status === 404 && page.body.includes("This event is no longer running"), `a ${e.status} event page returns 404`, `status ${page.status}`);
  }
  check((await html("/events/not-an-id")).status === 404, "a made-up event address returns 404");

  const detail = await html(`/events/${oneLeft?.id}`);
  check(/<meta property="og:title" content="Pottery Taster Evening"/.test(detail.body), "the event has a share title");
  check(/<meta property="og:image" content="[^"]+\/share-image"/.test(detail.body), "an event without a poster shares a generated image");
  const image = await fetch(`${BASE_URL}/events/${oneLeft?.id}/share-image`);
  check(image.status === 200 && image.headers.get("content-type") === "image/png", "the share image is a PNG");

  // Nothing private, for any event, on any public page.
  const pages = [list.body, clare.body, fullPage.body, plenty.body, detail.body, (await html("/")).body];
  const secrets = events.flatMap((e) => {
    const d = Array.isArray(e.event_private_details) ? e.event_private_details[0] : e.event_private_details;
    return [
      ...(d ? [d.exact_address, d.host_name, d.host_email, d.host_phone, d.emergency_contact_name] : []),
      ...e.registrations.map((r) => r.email),
    ];
  });
  const leaked = secrets.filter((secret) => pages.some((body) => body.includes(secret.replace(/'/g, "&#x27;")) || body.includes(secret)));
  check(leaked.length === 0, "no address, host detail or registrant email appears on public pages", leaked.join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
