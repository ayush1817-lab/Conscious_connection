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
    const card = admin.getByRole("region", { name: "What we're about: card 1" });
    check((await card.getByLabel("Card title").inputValue()) === "Local events", "the card starts with the current wording");
    await card.getByLabel("Card title").fill("Events near you");
    await card.getByLabel("Card text (one short sentence)").fill("Walks, coffees and workshops in your county.");
    await save(card);
    await visitor.goto(`${BASE_URL}/`);
    const values = await visitor.locator(".home-values").innerText();
    check(values.includes("Events near you") && values.includes("Walks, coffees and workshops in your county."), "the homepage shows the new card", values);
    check(values.includes("Community led"), "the other cards are unchanged");

    console.log("\nOther pages");
    await admin.getByRole("link", { name: "Other pages" }).click();
    await admin.waitForURL(`${BASE_URL}/admin/content/pages`);
    await axe(admin, "Other pages editor");
    const events = admin.getByRole("region", { name: "Events" });
    await events.getByLabel("Page title").fill("What's on");
    await events.getByLabel("Introduction").fill("Meetups across rural Ireland.\n\nNew events every week.");
    await save(events);
    await visitor.goto(`${BASE_URL}/events`);
    check((await visitor.getByRole("heading", { level: 1 }).innerText()) === "What's on", "the Events page title changes");
    check(await visitor.getByText("New events every week.").isVisible(), "the introduction changes, paragraphs and all");
    const podcasts = admin.getByRole("region", { name: "Podcasts" });
    await podcasts.getByLabel("Page title").fill("Listen");
    await save(podcasts);
    await visitor.goto(`${BASE_URL}/podcasts`);
    check((await visitor.getByRole("heading", { level: 1 }).innerText()) === "Listen", "the Podcasts page title changes");
    const host = admin.getByRole("region", { name: "Host an event" });
    await host.getByLabel("Page title").fill("");
    await host.getByRole("button", { name: "Save" }).click();
    const refused = await host.getByText("Please add a heading.").waitFor({ timeout: 5000 }).then(() => true, () => false);
    check(refused, "a page title can't be left empty");

    console.log("\nFallback");
    await service.from("site_sections").delete().eq("page", "pages").eq("key", "gallery");
    await visitor.goto(`${BASE_URL}/gallery`);
    check((await visitor.getByRole("heading", { level: 1 }).innerText()) === "Gallery", "a missing row falls back to the built-in title");
    check(await visitor.getByText("Moments from our events and community.").isVisible(), "and the built-in introduction");
    await admin.reload();
    check(await admin.getByRole("region", { name: "Gallery" }).isVisible(), "the editor recreates the missing section");
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
