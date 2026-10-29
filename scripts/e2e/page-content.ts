/**
 * npm run test:page-content  (client feedback, Oct 2026: editable page content)
 *
 * Needs the app running. Re-seeds first. Checks that the admin can change the
 * homepage's "What we're about" cards and the titles and introductions of the
 * other public pages, that the website shows the change straight after saving,
 * and that a page falls back to the built-in wording if its row is missing.
 */
import { execSync } from "node:child_process";
import type { Locator } from "playwright-core";
import { env, serviceClient } from "../lib/env";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();

// Saved once the section no longer has unsaved changes (an earlier toast may still be showing).
async function save(section: Locator) {
  await section.getByRole("button", { name: "Save" }).click();
  await section.getByText("You have unsaved changes.").waitFor({ state: "hidden", timeout: 10000 });
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const browser = await launch();
  try {
    const admin = await browser.newPage();
    await admin.goto(`${BASE_URL}/admin/login`);
    await admin.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await admin.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await admin.getByRole("button", { name: "Log in" }).click();
    await admin.getByRole("heading", { name: /Welcome/ }).waitFor();
    const visitor = await browser.newPage();

    console.log("Homepage cards");
    await admin.goto(`${BASE_URL}/admin/content/homepage`);
    await admin.getByRole("button", { name: "Introduction and 3 cards" }).click();
    const cards = admin.getByRole("region", { name: "Introduction and 3 cards" });
    const card = cards.getByRole("group", { name: "What we're about: card 1" });
    check((await card.getByLabel("Card title").inputValue()) === "Local events", "the card starts with the current wording");
    await card.getByLabel("Card title").fill("Events near you");
    await card.getByLabel("Card text (one short sentence)").fill("Walks, coffees and workshops in your county.");
    await save(cards);
    await visitor.goto(`${BASE_URL}/`);
    const values = await visitor.locator(".home-values").innerText();
    check(values.includes("Events near you") && values.includes("Walks, coffees and workshops in your county."), "the homepage shows the new card", values);
    check(values.includes("Community led"), "the other cards are unchanged");

    console.log("\nOther pages");
    await admin.getByRole("link", { name: "Other pages" }).click();
    await admin.waitForURL(`${BASE_URL}/admin/content/pages`);
    await axe(admin, "Other pages editor");
    const events = admin.getByRole("region", { name: "Events page" });
    await events.getByLabel("Page title").fill("What's on");
    await events.getByLabel("Introduction").fill("Meetups across rural Ireland.\n\nNew events every week.");
    await save(events);
    await visitor.goto(`${BASE_URL}/events`);
    check((await visitor.getByRole("heading", { level: 1 }).innerText()) === "What's on", "the Events page title changes");
    check(await visitor.getByText("New events every week.").isVisible(), "the introduction changes, paragraphs and all");
    await admin.getByRole("button", { name: "Podcasts page" }).click();
    const podcasts = admin.getByRole("region", { name: "Podcasts page" });
    await podcasts.getByLabel("Page title").fill("Listen");
    await save(podcasts);
    await visitor.goto(`${BASE_URL}/podcasts`);
    check((await visitor.getByRole("heading", { level: 1 }).innerText()) === "Listen", "the Podcasts page title changes");
    await admin.getByRole("button", { name: "Host an event page" }).click();
    const host = admin.getByRole("region", { name: "Host an event page" });
    await host.getByLabel("Page title").fill("");
    await host.getByRole("button", { name: "Save" }).click();
    const refused = await host.getByText("Please fill in “Page title”", { exact: false }).waitFor({ timeout: 5000 }).then(() => true, () => false);
    check(refused, "a page title can't be left empty");

    console.log("\nFallback");
    await service.from("site_sections").delete().eq("page", "pages").eq("key", "gallery");
    await visitor.goto(`${BASE_URL}/gallery`);
    check((await visitor.getByRole("heading", { level: 1 }).innerText()) === "Gallery", "a missing row falls back to the built-in title");
    check(await visitor.getByText("Moments from our events and community.").isVisible(), "and the built-in introduction");
    await admin.reload();
    check(await admin.getByRole("region", { name: "Gallery page" }).isVisible(), "the editor recreates the missing section");

    console.log("\nNew homepage text");
    await admin.goto(`${BASE_URL}/admin/content/homepage`);
    const banner = admin.getByRole("region", { name: "Top banner" });
    await banner.getByLabel("Sticker").fill("Come as you are");
    await banner.getByLabel("First button (opens Events)").fill("See what's on");
    await save(banner);
    await admin.getByRole("button", { name: "Moving ribbon" }).click();
    const ribbon = admin.getByRole("region", { name: "Moving ribbon" });
    await ribbon.getByLabel("Activities (one per line)").fill("Tea dances\n\n  Kayaking  ");
    await save(ribbon);
    await admin.getByRole("button", { name: "Footer" }).click();
    const footer = admin.getByRole("region", { name: "Footer" });
    await footer.getByLabel("Footer text").fill("Made with love across the island.");
    await save(footer);
    await visitor.goto(`${BASE_URL}/`);
    check(await visitor.getByText("Come as you are").isVisible(), "the banner sticker changes");
    check(await visitor.getByRole("link", { name: "See what's on" }).isVisible(), "the banner button changes");
    const ribbonText = await visitor.locator(".ribbon-row").first().innerText();
    check(ribbonText.includes("Kayaking") && !ribbonText.includes("Sea swims"), "the ribbon shows the new list", ribbonText);
    const { data: ribbonRow } = await service.from("site_sections").select("body").eq("page", "home").eq("key", "ribbon").single();
    check(ribbonRow?.body === "Tea dances\nKayaking", "blank lines and spaces are tidied", JSON.stringify(ribbonRow?.body));
    await visitor.goto(`${BASE_URL}/podcasts`);
    check(await visitor.getByText("Made with love across the island.").isVisible(), "the footer text shows on every page");
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
