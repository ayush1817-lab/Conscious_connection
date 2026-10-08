/**
 * npm run test:register  (public site milestone 3)
 *
 * Needs the app running. Re-seeds first. Registers through the event page and
 * checks: errors are shown and linked to fields, a registration lands on the
 * confirmation page, E8 holds the exact address and host first name, the
 * address appears on no page, a repeat registration re-sends E8 without a
 * second row, a full event shows a disabled "Event full", and the honeypot.
 */
import { execSync } from "node:child_process";
import { serviceClient } from "../lib/env";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const { data: event } = await service
    .from("events")
    .select("id, title, event_private_details(exact_address, host_name)")
    .eq("title", "Mindful Morning Yoga")
    .single();
  const { data: full } = await service.from("events").select("id").eq("title", "Sea Swim & Sauna").single();
  if (!event?.event_private_details || !full) throw new Error("Seed data is missing events the test needs.");
  const address = event.event_private_details.exact_address;
  const start = new Date().toISOString();

  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await page.goto(`${BASE_URL}/events/${event.id}`);
    const register = page.locator("#register");

    console.log("Validation");
    await register.getByRole("button", { name: "Register for this event" }).click();
    await register.getByText("Enter a name or nickname.").waitFor();
    check(await register.getByLabel("Your name").evaluate((el) => el.getAttribute("aria-invalid") === "true"), "the name field is marked invalid");
    check(
      (await register.getByLabel("Email", { exact: true }).getAttribute("aria-describedby"))?.includes("email-error") ?? false,
      "the email error is linked to its field",
    );
    check(await register.getByText("Please tick the box to agree").isVisible(), "consent is required");
    check(await page.evaluate(() => document.activeElement?.id === "name"), "focus moves to the first error");
    await axe(page, "registration form with errors");

    console.log("\nRegistering");
    await register.getByLabel("Your name").fill("Róisín");
    await register.getByLabel("Email", { exact: true }).fill("Roisin.Test@Example.com");
    await register.getByLabel(/I agree/).check();
    await register.getByRole("button", { name: "Register for this event" }).click();
    await page.waitForURL(`${BASE_URL}/events/${event.id}/registered`);
    check(await page.getByRole("heading", { name: "Check your email" }).isVisible(), "lands on the confirmation page (P5)");
    check(await page.getByText("spam").isVisible(), "mentions the spam folder");
    check(!(await page.content()).includes(address), "the confirmation page doesn't show the address");
    check((await page.content()).includes('name="robots" content="noindex'), "the confirmation page isn't indexed");
    await axe(page, "confirmation page");

    const { data: regs } = await service.from("registrations").select("name, email, consented_at").eq("event_id", event.id).ilike("email", "roisin.test@example.com");
    check(regs?.length === 1 && !!regs[0].consented_at && regs[0].name === "Róisín", "the registration is saved with consent time");

    const e8 = async () =>
      (await service.from("email_log").select("to_email, body").eq("template", "E8").gte("created_at", start)).data ?? [];
    const firstSend = await e8();
    check(firstSend.length === 1 && firstSend[0].to_email === "roisin.test@example.com", "E8 is sent to the registrant");
    check(firstSend[0]?.body.includes(address), "E8 contains the exact address");
    check(firstSend[0]?.body.includes("Laura") && !firstSend[0]?.body.includes("Fitzgerald"), "E8 gives the host's first name only");
    check(firstSend[0]?.body.includes("7 days after the event"), "E8 says details are deleted 7 days after");

    console.log("\nRegistering again with the same email");
    await page.goto(`${BASE_URL}/events/${event.id}`);
    await register.getByLabel("Your name").fill("Roisin");
    await register.getByLabel("Email", { exact: true }).fill("roisin.test@example.com");
    await register.getByLabel(/I agree/).check();
    await register.getByRole("button", { name: "Register for this event" }).click();
    await page.waitForURL(`${BASE_URL}/events/${event.id}/registered`);
    const { count } = await service.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", event.id).ilike("email", "roisin.test@example.com");
    check(count === 1, "no duplicate registration is created");
    check((await e8()).length === 2, "E8 is sent again");

    console.log("\nThe address is never on a page");
    for (const path of ["/", "/events", `/events/${event.id}`, `/events/${event.id}/registered`]) {
      const body = await (await fetch(`${BASE_URL}${path}`)).text();
      check(!body.includes(address), `${path} doesn't contain the address`);
    }

    console.log("\nFull event");
    await page.goto(`${BASE_URL}/events/${full.id}`);
    check(await page.locator("#register").getByRole("button", { name: "Event full" }).isDisabled(), "a full event shows a disabled Event full button");
    check((await page.locator("#register form").count()) === 0, "a full event has no registration form");

    console.log("\nHoneypot");
    const before = (await service.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", event.id)).count;
    await page.goto(`${BASE_URL}/events/${event.id}`);
    await register.getByLabel("Your name").fill("Bot");
    await register.getByLabel("Email", { exact: true }).fill("bot@example.com");
    await register.getByLabel(/I agree/).check();
    await page.evaluate(() => {
      (document.getElementById("website") as HTMLInputElement).value = "http://spam.example";
    });
    await register.getByRole("button", { name: "Register for this event" }).click();
    await page.waitForURL(`${BASE_URL}/events/${event.id}/registered`);
    const after = (await service.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", event.id)).count;
    check(before === after, "a filled honeypot looks like success but saves nothing");
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
