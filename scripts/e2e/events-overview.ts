/**
 * npm run test:overview  (milestone 3 acceptance)
 *
 * Needs the app running. Re-seeds the database first, because it clears a
 * "New" badge and an attention item. Checks that every seeded status appears
 * in the right place on A1/A2, that opening a request clears its New badge,
 * that Mark as seen updates the counts, and that A2 fits a 360px phone.
 */
import { execSync } from "node:child_process";
import type { Page } from "playwright-core";
import { env } from "../lib/env";
import { BASE_URL, check, finish, launch } from "./browser";

async function sectionText(page: Page, heading: RegExp) {
  return page.locator("section", { has: page.getByRole("heading", { name: heading }) }).innerText();
}

async function countTile(page: Page, label: string) {
  return page.locator("dl > div", { hasText: label }).locator("dd").innerText();
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

    console.log("A1 – Admin home");
    const eventsCard = await page.getByRole("link", { name: /Events/ }).innerText();
    check(eventsCard.includes("2 new requests · 3 need attention"), "Events card shows the counts", eventsCard);
    check(await page.getByRole("link", { name: /Website content/ }).isVisible(), "Website content card is shown");

    console.log("\nA2 – Events overview");
    await page.getByRole("link", { name: /Events/ }).click();
    await page.getByRole("heading", { name: "Events overview" }).waitFor();
    check((await countTile(page, "live events")) === "4", "4 live (upcoming) events");
    check((await countTile(page, "new requests")) === "2", "2 new requests");
    check((await countTile(page, "attention items")) === "3", "3 attention items");

    const attention = await sectionText(page, /^Attention items/);
    check(/Needs your decision\s+Contact detail request[\s\S]*Sunrise Meditation/.test(attention), "contact request needs a decision");
    check(/Update\s+Host edited event[\s\S]*Mindful Morning Yoga[\s\S]*Changed title, description and capacity/.test(attention), "host edit shows what changed");
    check(/Update\s+Host cancelled event[\s\S]*Forest Bathing/.test(attention), "host cancellation is an update");
    check((await page.getByRole("button", { name: /^Mark as seen/ }).count()) === 2, "only the 2 updates have Mark as seen");

    const requests = await sectionText(page, /^New requests/);
    check(/New\s+Gentle Walk & Chat/.test(requests), "unopened request (Gentle Walk & Chat) has the New badge", requests);
    check(requests.includes("Sound Bath Evening") && !/New\s+Sound Bath/.test(requests), "opened request has no New badge");
    check(requests.includes("Mary O'Brien") && /Submitted \d+ hours? ago/.test(requests), "shows host name and when it was submitted");

    const upcoming = await sectionText(page, /^Upcoming/);
    const order = ["Sunrise Meditation", "Mindful Morning Yoga", "Community Drum Circle", "Book Club Evening"];
    const positions = order.map((t) => upcoming.indexOf(t));
    check(positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1])), "upcoming shows the 4 live events, soonest first", upcoming);
    check(/Sunrise Meditation[\s\S]*?6 registered/.test(upcoming), "upcoming shows registered counts");

    const past = await sectionText(page, /^Past/);
    check(past.includes("Beach Clean & Connect") && past.includes("Removed automatically after 7 days"), "event that ended 2 days ago is in Past");
    check(!(await page.content()).includes("Autumn Picnic"), "event that ended 10 days ago is hidden");

    await page.getByText("Other events").click();
    const other = await page.locator("details").innerText();
    for (const [status, title] of [
      ["Needs changes", "Pottery for Beginners"],
      ["Declined", "Crystal Market"],
      ["Cancelled", "Forest Bathing"],
      ["Taken down", "Open Mic Night"],
    ]) {
      check(new RegExp(`${status} \\(1\\)[\\s\\S]*${title}`).test(other), `${title} is under ${status}`);
    }

    console.log("\nNew badge clears on open");
    await page.getByRole("link", { name: /Gentle Walk & Chat/ }).click();
    await page.getByRole("heading", { name: "Gentle Walk & Chat" }).waitFor();
    check(await page.getByText("Only visible to you").isVisible(), "request detail shows the private details panel");
    await page.goto(`${BASE_URL}/admin/events`);
    const after = await sectionText(page, /^New requests/);
    check(!/New\s+Gentle Walk/.test(after), "Gentle Walk & Chat no longer has the New badge", after);

    console.log("\nMark as seen");
    await page.getByRole("button", { name: /Mark as seen: Host edited event/ }).click();
    const toast = page.getByText("Marked as seen.");
    check(await toast.waitFor({ timeout: 5000 }).then(() => true, () => false), "shows a confirmation");
    await page.waitForFunction(() => document.body.innerText.includes("Attention items (2)"));
    check((await countTile(page, "attention items")) === "2", "attention count updates to 2");
    await page.goto(`${BASE_URL}/admin`);
    const home = await page.getByRole("link", { name: /Events/ }).innerText();
    check(home.includes("2 new requests · 2 need attention"), "admin home counts update", home);

    console.log("\nMobile (360px)");
    const phone = await context.newPage();
    await phone.setViewportSize({ width: 360, height: 780 });
    await phone.goto(`${BASE_URL}/admin/events`);
    await phone.getByRole("heading", { name: "Events overview" }).waitFor();
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 0, "no sideways scrolling at 360px", `${overflow}px too wide`);
    if (process.env.E2E_SCREENSHOT_DIR) {
      await phone.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/a2-mobile.png`, fullPage: true });
      await page.goto(`${BASE_URL}/admin/events`);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.getByRole("heading", { name: "Events overview" }).waitFor();
      await page.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/a2-desktop.png`, fullPage: true });
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
