/**
 * npm run test:live  (milestone 5 acceptance)
 *
 * Needs the app running. Re-seeds the database first. Checks A7 for every
 * attention type (mark as seen, share or decline contact details), A6 for live
 * events (activity log, regenerate host link, take down, cancel), that every
 * attention item can be cleared, that counts update straight away, and that
 * each action sends the right email (E4, E9, E10, E11).
 */
import { execSync } from "node:child_process";
import type { Page } from "playwright-core";
import { hashHostToken } from "../../lib/events/host-token";
import { env, serviceClient } from "../lib/env";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();

async function eventId(title: string) {
  const { data } = await service.from("events").select("id").eq("title", title).single();
  return data!.id;
}

async function eventRow(id: string) {
  const { data } = await service.from("events").select("status, status_reason, host_edit_token_hash").eq("id", id).single();
  return data!;
}

async function emails(template: string, since: string) {
  const { data } = await service.from("email_log").select("*").eq("template", template).gte("created_at", since);
  return data ?? [];
}

async function visible(page: Page, text: string | RegExp, timeout = 5000) {
  return page
    .getByText(text)
    .first()
    .waitFor({ timeout })
    .then(() => true, () => false);
}

async function countTile(page: Page, label: string) {
  return page.locator("dl > div", { hasText: label }).locator("dd").innerText();
}

async function overview(page: Page) {
  await page.goto(`${BASE_URL}/admin/events`);
  await page.getByRole("heading", { name: "Events overview" }).waitFor();
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const start = new Date().toISOString();
  const browser = await launch();
  const sunrise = await eventId("Sunrise Meditation");
  const drum = await eventId("Community Drum Circle");
  const bookClub = await eventId("Book Club Evening");
  const beach = await eventId("Beach Clean & Connect");

  try {
    const context = await browser.newContext();
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await page.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await page.getByRole("button", { name: "Log in" }).click();
    await page.getByRole("heading", { name: /Welcome/ }).waitFor();

    console.log("A7 – Host edited");
    await overview(page);
    await page.getByRole("link", { name: /Host edited event/ }).click();
    await page.getByRole("heading", { name: "Host edited event" }).waitFor();
    const table = await page.locator("table").innerText();
    check(/Title\s+Morning Yoga\s+Mindful Morning Yoga/.test(table), "shows the title before → after", table);
    check(/Capacity\s+15 people\s+20 people/.test(table), "shows capacity before → after");
    check(await page.getByRole("button", { name: "Take down" }).isVisible(), "offers Take down");
    await page.getByRole("button", { name: "Mark as seen" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events`);
    check(await visible(page, "Marked as seen."), "Mark as seen confirms");
    check((await countTile(page, "attention items")) === "2", "attention count drops to 2 straight away");

    console.log("\nA7 – Host cancelled");
    await page.getByRole("link", { name: /Host cancelled event/ }).click();
    await page.getByRole("heading", { name: "Host cancelled event" }).waitFor();
    check(await visible(page, "Nothing else needs doing."), "explains nothing else is needed");
    await page.getByRole("button", { name: "Mark as seen" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events`);
    check((await countTile(page, "attention items")) === "1", "attention count drops to 1");

    console.log("\nA7 – Contact request: share");
    await page.getByRole("link", { name: /Contact detail request/ }).first().click();
    await page.getByRole("heading", { name: "Contact detail request" }).waitFor();
    check(await visible(page, "meeting point has moved"), "shows the host's reason");
    check(await visible(page, "6 people have registered."), "shows the registrant count");
    check((await page.getByRole("button", { name: "Mark as seen" }).count()) === 0, "no Mark as seen on a decision");
    const contactUrl = page.url();
    await page.getByRole("button", { name: "Share contact details" }).click();
    const share = page.getByRole("dialog", { name: "Share contact details?" });
    check(
      await share.getByText("The names and email addresses of the 6 registered people will be emailed to Áine Ní Bhriain (aine@example.com).").isVisible(),
      "confirmation says exactly what will be shared and with whom",
    );
    await share.getByRole("button", { name: "Yes, share them" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events`);
    check(await visible(page, "Contact details shared. Áine Ní Bhriain has been emailed."), "share confirms");
    check((await countTile(page, "attention items")) === "0", "attention count drops to 0");
    check(await visible(page, "You're all caught up."), "attention list shows the empty state");
    const e10 = (await emails("E10", start)).find((e) => e.to_email === "aine@example.com");
    const { data: sunriseRegs } = await service.from("registrations").select("email").eq("event_id", sunrise);
    check(!!e10 && sunriseRegs!.every((r) => e10.body.includes(r.email)), "E10 lists every registrant's email");
    const { data: shared } = await service.from("contact_requests").select("status, decided_at").eq("event_id", sunrise).single();
    check(shared?.status === "shared" && !!shared.decided_at, "request is marked shared");
    await page.goto(contactUrl);
    check(await visible(page, "This has already been dealt with"), "reopening the item says it's done");
    check((await page.getByRole("button", { name: "Share contact details" }).count()) === 0, "and offers no actions");

    console.log("\nA7 – Contact request: decline");
    const { data: req } = await service
      .from("contact_requests")
      .insert({ event_id: drum, host_reason: "I want to send a reminder." })
      .select("id")
      .single();
    const { data: item } = await service
      .from("attention_items")
      .insert({ event_id: drum, type: "contact_request", ref_id: req!.id, needs_decision: true })
      .select("id")
      .single();
    await page.goto(`${BASE_URL}/admin/attention/${item!.id}`);
    await page.getByRole("button", { name: "Decline" }).click();
    const decline = page.getByRole("dialog", { name: "Decline this request" });
    await decline.getByRole("button", { name: "Send and decline" }).click();
    check(await visible(page, "Please write a reason."), "an empty reason is refused");
    await decline.getByLabel(/Explain your decision/).fill("Reminders aren't needed for this event.");
    await decline.getByRole("button", { name: "Send and decline" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events`);
    check(await visible(page, "Request declined. Ciara Murphy has been emailed."), "decline confirms");
    const e10d = (await emails("E10", start)).find((e) => e.to_email === "ciara@example.com");
    check(!!e10d && e10d.body.includes("Reminders aren't needed for this event.") && !/[a-z]+\d+@example\.com/.test(e10d.body), "E10 has the reason and no registrant details");
    const { data: declinedReq } = await service.from("contact_requests").select("status, admin_reason").eq("id", req!.id).single();
    check(declinedReq?.status === "declined" && declinedReq.admin_reason === "Reminders aren't needed for this event.", "request is marked declined with the reason");

    console.log("\nA6 – Activity log and new host link");
    await page.goto(`${BASE_URL}/admin/events/${drum}`);
    for (const name of ["Take down", "Cancel event", "Regenerate host link"]) {
      const button = page.getByRole("button", { name, exact: true });
      check(await button.waitFor().then(() => true, () => false), `live event offers ${name}`);
    }
    await page.getByRole("link", { name: /Activity log/ }).click();
    await page.waitForURL(/tab=activity/);
    const log = await page.getByRole("region", { name: "Activity log" }).innerText();
    check(/Declined the contact details request[\s\S]*Reminders aren't needed[\s\S]*Approved/.test(log), "activity log lists actions, newest first", log);

    await page.getByRole("button", { name: "Regenerate host link" }).click();
    const regen = page.getByRole("dialog", { name: "Send the host a new link?" });
    check(await regen.getByText("The old link will stop working straight away.").isVisible(), "warns the old link will stop working");
    const oldHash = (await eventRow(drum)).host_edit_token_hash;
    await regen.getByRole("button", { name: "Send new link" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events/${drum}/new-host-link`);
    check(await visible(page, "Ciara Murphy has been emailed the new link."), "says the host has been emailed");
    await page.getByRole("button", { name: "Copy host link" }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const token = copied.match(/\/host\/([A-Za-z0-9_-]{43})$/)?.[1] ?? "";
    const newHash = (await eventRow(drum)).host_edit_token_hash;
    check(newHash !== oldHash && hashHostToken(token) === newHash, "the new link replaces the old one");
    const e4 = (await emails("E4", start)).find((e) => e.to_email === "ciara@example.com");
    check(!!e4 && e4.subject.startsWith("Your new private link") && e4.body.includes(copied), "E4 is re-sent with the new link");

    console.log("\nA6 – Take down");
    await page.goto(`${BASE_URL}/admin/events/${bookClub}`);
    await page.getByRole("button", { name: "Take down", exact: true }).click();
    const takeDown = page.getByRole("dialog", { name: "Take down this event" });
    await takeDown.getByRole("button", { name: "Send and take down" }).click();
    check(await visible(page, "Please write a reason."), "an empty reason is refused");
    check((await eventRow(bookClub)).status === "live", "nothing changes without a reason");
    await takeDown.getByLabel(/Explain your decision/).fill("The café has closed.");
    await takeDown.getByRole("button", { name: "Send and take down" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events/${bookClub}`);
    check(await visible(page, "Event taken down. Fiona Ryan has been emailed."), "take down confirms");
    check((await eventRow(bookClub)).status === "taken_down", "status is taken down");
    check((await page.getByRole("button", { name: "Cancel event" }).count()) === 0, "a taken-down event has no live actions");
    const e11 = (await emails("E11", start)).find((e) => e.to_email === "fiona@example.com");
    check(!!e11 && e11.body.includes("The café has closed."), "E11 is in email_log with the reason");

    console.log("\nA6 – Cancel");
    // An open update on the event should be cleared by cancelling it.
    const { data: stray } = await service
      .from("attention_items")
      .insert({ event_id: sunrise, type: "host_cancelled", needs_decision: false })
      .select("id")
      .single();
    await page.goto(`${BASE_URL}/admin/events/${sunrise}`);
    check(await visible(page, "Needs your attention"), "the event page lists its open attention item");
    await page.getByRole("button", { name: "Cancel event" }).click();
    const cancel = page.getByRole("dialog", { name: "Cancel this event?" });
    check(await cancel.getByText("The 6 registered people will be emailed. This can't be undone.").isVisible(), "confirmation gives the count and warns");
    await cancel.getByRole("button", { name: "Yes, cancel the event" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events/${sunrise}`);
    check(await visible(page, "Event cancelled. All 6 registered people have been emailed."), "cancel confirms");
    check((await eventRow(sunrise)).status === "cancelled", "status is cancelled");
    const e9 = (await emails("E9", start)).filter((e) => e.subject === "Cancelled: Sunrise Meditation");
    check(e9.length === 6 && sunriseRegs!.every((r) => e9.some((e) => e.to_email === r.email)), "E9 goes to each of the 6 registrants", `${e9.length} sent`);
    const { data: strayAfter } = await service.from("attention_items").select("resolved_at").eq("id", stray!.id).single();
    check(!!strayAfter?.resolved_at, "cancelling clears the event's open attention items");

    console.log("\nCounts");
    await overview(page);
    check((await countTile(page, "live events")) === "4", "live count drops from 6 to 4");
    check((await countTile(page, "attention items")) === "0", "attention count is 0");
    await page.getByText("Other events").click();
    const other = await page.locator("details").innerText();
    check(/Cancelled \(2\)[\s\S]*Sunrise Meditation/.test(other) && /Taken down \(2\)[\s\S]*Book Club Evening/.test(other), "events move to Cancelled and Taken down");

    await page.goto(`${BASE_URL}/admin/events/${beach}`);
    await page.getByRole("heading", { name: "Beach Clean & Connect" }).waitFor();
    check((await page.getByRole("button", { name: "Take down" }).count()) === 0, "an event that has ended has no live actions");

    console.log("\nMobile (360px)");
    const phone = await context.newPage();
    await phone.setViewportSize({ width: 360, height: 780 });
    for (const [label, url] of [
      ["A6", `${BASE_URL}/admin/events/${drum}`],
      ["A6 activity log", `${BASE_URL}/admin/events/${drum}?tab=activity`],
      ["A7", contactUrl],
    ]) {
      await phone.goto(url);
      await phone.locator("h1").waitFor();
      const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(overflow <= 0, `${label} has no sideways scrolling at 360px`, `${overflow}px too wide`);
    }
    if (process.env.E2E_SCREENSHOT_DIR) {
      const dir = process.env.E2E_SCREENSHOT_DIR;
      await phone.goto(`${BASE_URL}/admin/events/${drum}`);
      await phone.screenshot({ path: `${dir}/a6-mobile.png`, fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${BASE_URL}/admin/events/${drum}`);
      await page.screenshot({ path: `${dir}/a6-desktop.png`, fullPage: true });
      await page.goto(`${BASE_URL}/admin/events/${drum}?tab=activity`);
      await page.screenshot({ path: `${dir}/a6-activity.png`, fullPage: true });
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
