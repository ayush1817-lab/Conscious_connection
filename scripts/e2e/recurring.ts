/**
 * npm run test:recurring  (client feedback, Oct 2026: recurring events)
 *
 * Needs the app running. Re-seeds first. Checks: a weekly event is listed once
 * with "Every <day>, <time>" and its next date; people pick a date to register
 * and the RSVP (and E8) is for that date; places are counted per date; the
 * public form saves a weekly event with an end date; and the admin editor can
 * change an event, with the repeat locked once people have registered.
 */
import { execSync } from "node:child_process";
import { describeRecurrence, upcomingOccurrences } from "../../lib/events/recurrence";
import { formatDate } from "../../lib/format";
import { env, serviceClient } from "../lib/env";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();

function inDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const start = new Date().toISOString();
  const { data: walk } = await service
    .from("events")
    .select("id, title, start_at, end_at, recurrence_rule, recurrence_until")
    .eq("title", "Weekly Evening Walk")
    .single();
  if (!walk) throw new Error("Seed data is missing the weekly event.");
  const label = describeRecurrence(walk)!;
  const dates = upcomingOccurrences(walk, 3);

  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });

    console.log("Listing");
    await page.goto(`${BASE_URL}/events`);
    const cards = page.locator("article", { hasText: "Weekly Evening Walk" });
    check((await cards.count()) === 1, "a weekly event is listed once");
    const card = await cards.first().innerText();
    check(card.includes(label), `the card says "${label}"`, card);
    check(card.includes("Next:"), "the card shows the next date");

    console.log("\nRegistering for a chosen date");
    await page.goto(`${BASE_URL}/events/${walk.id}`);
    check((await page.locator("main").innerText()).includes(label), "the event page shows the repeat");
    const register = page.locator("#register");
    const picker = register.getByLabel("Which date?");
    check((await picker.locator("option").count()) === 8, "people can pick from the next 8 dates");
    check((await picker.inputValue()) === dates[0].start, "the next date is picked by default");
    await axe(page, "recurring event page");
    await picker.selectOption(dates[1].start);
    await register.getByLabel("Your name").fill("Niamh");
    await register.getByLabel("Email", { exact: true }).fill("niamh.weekly@example.com");
    await register.getByLabel(/I agree/).check();
    await register.getByRole("button", { name: "Register for this event" }).click();
    await page.waitForURL(`${BASE_URL}/events/${walk.id}/registered`);
    const { data: rsvp } = await service.from("registrations").select("occurrence_start").eq("event_id", walk.id).eq("email", "niamh.weekly@example.com").single();
    check(new Date(rsvp?.occurrence_start ?? 0).toISOString() === dates[1].start, "the RSVP is for the chosen date");
    const { data: e8 } = await service.from("email_log").select("body").eq("template", "E8").eq("to_email", "niamh.weekly@example.com").gte("created_at", start).single();
    check(e8?.body.includes(formatDate(dates[1].start)) ?? false, "E8 gives the chosen date");
    check(e8?.body.includes(label) ?? false, "E8 says the event repeats");

    console.log("\nThe same person can come another week");
    await page.goto(`${BASE_URL}/events/${walk.id}`);
    await register.getByLabel("Which date?").selectOption(dates[2].start);
    await register.getByLabel("Your name").fill("Niamh");
    await register.getByLabel("Email", { exact: true }).fill("niamh.weekly@example.com");
    await register.getByLabel(/I agree/).check();
    await register.getByRole("button", { name: "Register for this event" }).click();
    await page.waitForURL(`${BASE_URL}/events/${walk.id}/registered`);
    const { count } = await service.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", walk.id).eq("email", "niamh.weekly@example.com");
    check(count === 2, "two dates, two RSVPs");

    console.log("\nPlaces are per date");
    await service.from("events").update({ capacity: 2 }).eq("id", walk.id); // the seed has 2 people on the next date
    await page.goto(`${BASE_URL}/events/${walk.id}`);
    const options = await register.getByLabel("Which date?").locator("option").allInnerTexts();
    check(options[0].includes("(full)"), "the full date is marked full", options[0]);
    check(await register.getByLabel("Which date?").locator("option").first().isDisabled(), "a full date can't be picked");
    check(!options[3].includes("full"), "later dates are still open", options[3]);
    await service.from("events").update({ capacity: 10 }).eq("id", walk.id);

    console.log("\nSubmitting a weekly event");
    const title = `Weekly Coffee ${Date.now()}`;
    await page.goto(`${BASE_URL}/submit-event`);
    await page.getByLabel("Event title").fill(title);
    await page.getByLabel("County").selectOption("Co. Cork");
    await page.getByLabel("Date", { exact: true }).fill(inDays(5));
    await page.getByLabel("Start time").fill("10:00");
    await page.getByLabel("End time").fill("11:30");
    await page.getByLabel("Does it repeat?").selectOption("weekly");
    await page.getByLabel("Last date (optional)").fill(inDays(2));
    await page.getByLabel("Description").fill("Coffee and a chat, every week.");
    await page.getByLabel("Exact address").fill("The Coffee Shop, Main Street, Mallow");
    await page.getByLabel("Your name").fill("Eimear Test");
    await page.getByLabel("Your email").fill("eimear@example.com");
    await page.getByLabel("Your phone").fill("087 123 4567");
    await page.getByLabel("About you or your group").fill("Friends who like coffee");
    await page.getByLabel(/I agree/).check();
    await page.getByRole("button", { name: "Submit event for review" }).click();
    await page.getByText("The last date can't be before the first date.").waitFor();
    check(true, "an end date before the first date is refused");
    await page.getByLabel("Last date (optional)").fill(inDays(40));
    await page.getByLabel(/I agree/).check();
    await page.getByRole("button", { name: "Submit event for review" }).click();
    await page.getByRole("heading", { name: "Event submitted" }).waitFor();
    const { data: saved } = await service.from("events").select("id, recurrence_rule, recurrence_until, series_end_at").eq("title", title).single();
    check(JSON.stringify(saved?.recurrence_rule) === JSON.stringify({ freq: "weekly", interval: 1 }), "the weekly rule is saved");
    check(saved?.recurrence_until === inDays(40), "the last date is saved");

    console.log("\nAdmin editor");
    const admin = await browser.newPage();
    await admin.goto(`${BASE_URL}/admin/login`);
    await admin.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await admin.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await admin.getByRole("button", { name: "Log in" }).click();
    await admin.getByRole("heading", { name: /Welcome/ }).waitFor();
    await admin.goto(`${BASE_URL}/admin/events/${saved!.id}`);
    await admin.getByRole("heading", { name: title }).waitFor();
    check((await admin.locator("main").innerText()).includes("Repeats"), "the admin sees the repeat");
    await admin.getByRole("link", { name: "Edit event" }).click();
    await admin.getByRole("heading", { name: "Edit event" }).waitFor();
    await axe(admin, "admin event editor");
    await admin.getByLabel("Event title").fill(`${title} (edited)`);
    await admin.getByLabel("Does it repeat?").selectOption("none");
    await admin.getByRole("button", { name: "Save changes" }).click();
    await admin.waitForURL(`${BASE_URL}/admin/events/${saved!.id}`);
    await admin.getByText("Event saved.").waitFor({ timeout: 5000 }).catch(() => {});
    check(await admin.getByText("Event saved.").isVisible(), "a toast confirms the save");
    const { data: edited } = await service.from("events").select("title, recurrence_rule, recurrence_until").eq("id", saved!.id).single();
    check(edited?.title === `${title} (edited)` && edited.recurrence_rule === null && edited.recurrence_until === null, "the edit is saved");

    await admin.goto(`${BASE_URL}/admin/events/${walk.id}/edit`);
    check(await admin.getByLabel("Does it repeat?").isDisabled(), "the repeat is locked once people have registered");
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
