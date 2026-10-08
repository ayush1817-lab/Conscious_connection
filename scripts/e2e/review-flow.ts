/**
 * npm run test:review  (milestone 4 acceptance)
 *
 * Needs the app running. Re-seeds the database first. Checks A3 (request
 * detail), A4 (reason dialog) and A5 (approved), that request changes /
 * decline / approve each work and email the host (E2/E3/E4 in email_log), that
 * reasons are required, and that a stale page can't make an invalid change.
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

async function emailsTo(to: string) {
  const { data } = await service.from("email_log").select("*").eq("to_email", to).order("created_at");
  return data ?? [];
}

async function visible(page: Page, text: string | RegExp, timeout = 5000) {
  return page
    .getByText(text)
    .first()
    .waitFor({ timeout })
    .then(() => true, () => false);
}

function hostTokenIn(body: string) {
  return body.match(/\/host\/([A-Za-z0-9_-]{43})/)?.[1] ?? null;
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const browser = await launch();
  const soundBath = await eventId("Sound Bath Evening");
  const gentleWalk = await eventId("Gentle Walk & Chat");

  try {
    const context = await browser.newContext();
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await page.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await page.getByRole("button", { name: "Log in" }).click();
    await page.getByRole("heading", { name: /Welcome/ }).waitFor();

    console.log("A3 – Request detail");
    await page.goto(`${BASE_URL}/admin/events`);
    await page.getByRole("link", { name: /Sound Bath Evening/ }).click();
    await page.getByRole("heading", { name: "Sound Bath Evening" }).waitFor();
    for (const name of ["Approve", "Request changes", "Decline"]) {
      check(await page.getByRole("button", { name, exact: true }).isVisible(), `shows ${name}`);
    }
    check(await page.getByText("Only visible to you").isVisible(), "shows the private details panel");

    console.log("\nA4 – Reason dialog");
    await page.getByRole("button", { name: "Decline", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Decline this event" });
    await dialog.waitFor();
    check(await dialog.getByText("This will be emailed to John Kelly (john@example.com).").isVisible(), "says who the reason is emailed to");
    await dialog.getByRole("button", { name: "Send and decline" }).click();
    check(await visible(page, "Please write a reason. It will be emailed to the host."), "an empty reason is refused with a clear message");
    check((await eventRow(soundBath)).status === "pending", "nothing changes without a reason");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    check(!(await dialog.isVisible()), "Cancel closes the dialog");

    await page.getByRole("button", { name: "Request changes", exact: true }).click();
    const changes = page.getByRole("dialog", { name: "Request changes" });
    await changes.getByLabel(/Explain your decision/).fill("Please add what people should bring.");
    await changes.getByRole("button", { name: "Send and request changes" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events`);
    check(await visible(page, "Changes requested. John Kelly has been emailed."), "request changes shows a confirmation");
    const afterChanges = await eventRow(soundBath);
    check(afterChanges.status === "needs_changes" && afterChanges.status_reason === "Please add what people should bring.", "status is needs changes, with the reason");
    const [e2] = await emailsTo("john@example.com");
    const e2Token = e2 ? hostTokenIn(e2.body) : null;
    check(e2?.template === "E2" && e2.body.includes("Please add what people should bring."), "E2 is in email_log with the reason");
    check(!!e2Token && hashHostToken(e2Token) === afterChanges.host_edit_token_hash, "E2 has a working edit link (hash matches)");
    await page.getByText("Other events").click();
    check(/Needs changes \(2\)[\s\S]*Sound Bath Evening/.test(await page.locator("details").innerText()), "the event moves to Needs changes");

    console.log("\nInvalid change from a stale page");
    // The host resubmits (needs_changes → pending happens on the host pages later).
    await service.from("events").update({ status: "pending", status_reason: null }).eq("id", soundBath);
    const stale = await context.newPage();
    await stale.goto(`${BASE_URL}/admin/events/${soundBath}`);
    await stale.getByRole("button", { name: "Approve" }).waitFor();

    await page.goto(`${BASE_URL}/admin/events/${soundBath}`);
    await page.getByRole("button", { name: "Decline", exact: true }).click();
    const decline = page.getByRole("dialog", { name: "Decline this event" });
    await decline.getByLabel(/Explain your decision/).fill("This is very similar to another event that week.");
    await decline.getByRole("button", { name: "Send and decline" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events`);
    check(await visible(page, "Event declined. John Kelly has been emailed."), "decline shows a confirmation");
    const e3 = (await emailsTo("john@example.com")).find((e) => e.template === "E3");
    check(!!e3 && e3.body.includes("This is very similar to another event that week."), "E3 is in email_log with the reason");
    check((await eventRow(soundBath)).status === "declined", "status is declined");

    await stale.getByRole("button", { name: "Approve" }).click();
    check(await visible(stale, "This event is declined, so it can't be approved."), "approving from the old page is refused");
    const after = await eventRow(soundBath);
    check(after.status === "declined", "the event stays declined");
    check(!(await emailsTo("john@example.com")).some((e) => e.template === "E4"), "no approval email is sent");

    console.log("\nA5 – Approve");
    await page.goto(`${BASE_URL}/admin/events/${gentleWalk}`);
    await page.getByRole("button", { name: "Approve" }).click();
    await page.waitForURL(`${BASE_URL}/admin/events/${gentleWalk}/approved`);
    check(await page.getByRole("heading", { name: "Approved." }).isVisible(), "shows Approved.");
    check(await visible(page, "Mary O'Brien has been emailed their private link."), "says the host has been emailed");
    const live = await eventRow(gentleWalk);
    check(live.status === "live", "status is live");
    const viewLive = await page.getByRole("link", { name: "View live event" }).getAttribute("href");
    check(viewLive === `${env("SITE_URL").replace(/\/+$/, "")}/events/${gentleWalk}`, "View live event links to the public page", viewLive ?? "");

    await page.getByRole("button", { name: "Copy host link" }).click();
    check(await visible(page, "Copied ✓"), "Copy host link confirms");
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const copiedToken = hostTokenIn(copied);
    check(!!copiedToken && hashHostToken(copiedToken) === live.host_edit_token_hash, "copied link matches the stored hash");
    const e4 = (await emailsTo("mary@example.com")).find((e) => e.template === "E4");
    check(!!e4 && e4.body.includes(copied) && e4.body.includes("Keep this email safe"), "E4 is in email_log with the same private link");
    const { data: dbRow } = await service.from("events").select("*").eq("id", gentleWalk).single();
    check(!JSON.stringify(dbRow).includes(copiedToken ?? "-"), "the raw token is not stored anywhere on the event");

    const other = await browser.newContext();
    await other.addCookies(await context.cookies().then((cs) => cs.filter((c) => c.name !== "cc_host_link")));
    const later = await other.newPage();
    await later.goto(`${BASE_URL}/admin/events/${gentleWalk}/approved`);
    await later.getByRole("heading", { name: "Approved." }).waitFor();
    check((await later.getByRole("button", { name: "Copy host link" }).count()) === 0, "the host link isn't shown again later");

    await page.goto(`${BASE_URL}/admin/events`);
    await page.getByRole("heading", { name: "Events overview" }).waitFor();
    check(/New requests \(0\)/.test(await page.locator("main").innerText()), "no new requests left");
    check(/Upcoming \(7 live events\)[\s\S]*Gentle Walk & Chat/.test(await page.locator("main").innerText()), "approved event is in Upcoming");

    console.log("\nMobile (360px)");
    await service.from("events").update({ status: "pending", status_reason: null }).eq("id", soundBath);
    const phone = await context.newPage();
    await phone.setViewportSize({ width: 360, height: 780 });
    await phone.goto(`${BASE_URL}/admin/events/${soundBath}`);
    await phone.getByRole("button", { name: "Approve" }).waitFor();
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 0, "A3 has no sideways scrolling at 360px", `${overflow}px too wide`);
    await phone.getByRole("button", { name: "Decline", exact: true }).click();
    const box = await phone.getByRole("dialog").boundingBox();
    check(!!box && box.x >= 0 && box.x + box.width <= 360, "A4 fits a 360px screen");
    if (process.env.E2E_SCREENSHOT_DIR) {
      await phone.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/a4-mobile.png` });
      await phone.keyboard.press("Escape");
      await phone.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/a3-mobile.png`, fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${BASE_URL}/admin/events/${soundBath}`);
      await page.getByRole("button", { name: "Approve" }).waitFor();
      await page.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/a3-desktop.png`, fullPage: true });
      await page.goto(`${BASE_URL}/admin/events/${gentleWalk}/approved`);
      await page.getByRole("heading", { name: "Approved." }).waitFor();
      await page.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/a5-desktop.png` });
    }
    await service.from("events").update({ status: "declined" }).eq("id", soundBath);
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
