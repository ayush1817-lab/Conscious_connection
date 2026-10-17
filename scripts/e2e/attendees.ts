/**
 * npm run test:attendees  (client feedback, Oct 2026: admin attendee list)
 *
 * Needs the app running. Re-seeds first. Checks that the admin event page lists
 * every attendee with their email, that the CSV download has them all (and per
 * date for a weekly event), that spreadsheet formulas in names are defused,
 * that each download is logged, and that nobody else can download the list.
 */
import { execSync } from "node:child_process";
import { env, serviceClient } from "../lib/env";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const { data: sunrise } = await service.from("events").select("id, registrations(name, email)").eq("title", "Sunrise Meditation").single();
  const { data: walk } = await service.from("events").select("id, start_at, end_at").eq("title", "Weekly Evening Walk").single();
  if (!sunrise || !walk) throw new Error("Seed data is missing events the test needs.");
  await service.from("registrations").insert({ event_id: sunrise.id, name: "=HYPERLINK(\"x\")", email: "formula@example.com", consented_at: new Date().toISOString() });
  const expected = [...sunrise.registrations.map((r) => r.email), "formula@example.com"];

  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await page.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await page.getByRole("button", { name: "Log in" }).click();
    await page.getByRole("heading", { name: /Welcome/ }).waitFor();

    console.log("Attendee list");
    await page.goto(`${BASE_URL}/admin/events/${sunrise.id}`);
    const list = page.getByRole("region", { name: /Attendees/ });
    const text = await list.innerText();
    check(text.includes(`Attendees (${expected.length})`), "the heading counts everyone", text.slice(0, 40));
    check(expected.every((email) => text.includes(email)), "every attendee's email is shown");
    check(await list.getByRole("link", { name: sunrise.registrations[0].email }).getAttribute("href") === `mailto:${sunrise.registrations[0].email}`, "emails are mailto links");
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    check(width <= 360, "the list fits a phone", `${width}px`);
    await axe(page, "admin event page with attendees");

    console.log("\nCSV download");
    const [download] = await Promise.all([page.waitForEvent("download"), list.getByRole("link", { name: "Download all as CSV" }).click()]);
    check(/^attendees-sunrise-meditation\.csv$/.test(download.suggestedFilename()), "the file is named after the event", download.suggestedFilename());
    const res = await context.request.get(`${BASE_URL}/admin/events/${sunrise.id}/attendees`);
    const csv = await res.text();
    check(res.status() === 200 && (res.headers()["content-type"] ?? "").startsWith("text/csv"), "it's a CSV file");
    const rows = csv.replace(/^﻿/, "").trim().split("\r\n");
    check(rows[0] === "Name,Email,Event date,Time,Registered", "it has a header row", rows[0]);
    check(rows.length === expected.length + 1 && expected.every((email) => csv.includes(email)), "it has every attendee", `${rows.length - 1} rows`);
    check(csv.includes(`"'=HYPERLINK(""x"")"`), "a name that looks like a formula is made safe");
    const { data: log } = await service.from("event_activity").select("action, note").eq("event_id", sunrise.id).eq("action", "Downloaded the attendee list");
    check((log?.length ?? 0) >= 1, "downloads are noted in the activity log");

    console.log("\nWeekly event, per date");
    await page.goto(`${BASE_URL}/admin/events/${walk.id}`);
    const weekly = page.getByRole("region", { name: /Attendees/ });
    check((await weekly.locator("h3").count()) >= 1 && /2 people of 10/.test(await weekly.innerText()), "attendees are grouped by date, with places per date", await weekly.innerText());
    const href = await weekly.getByRole("link", { name: /Download this date/ }).first().getAttribute("href");
    const one = await (await context.request.get(`${BASE_URL}${href}`)).text();
    check(one.trim().split("\r\n").length === 3, "a date's download has just that date's people", one);

    console.log("\nNobody else");
    const anon = await browser.newContext();
    const blocked = await anon.request.get(`${BASE_URL}/admin/events/${sunrise.id}/attendees`, { maxRedirects: 0 });
    const body = await blocked.text();
    check(blocked.status() !== 200 && !expected.some((email) => body.includes(email)), "a visitor who isn't signed in can't download it", String(blocked.status()));
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
