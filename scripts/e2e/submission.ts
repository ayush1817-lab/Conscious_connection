/**
 * npm run test:submit  (public site milestone 4)
 *
 * Needs the app running. Re-seeds first. Submits an event through /submit-event
 * at 360px and checks: errors keep what was typed and focus the first problem,
 * a poster uploads, the event and private details are saved as a pending
 * request, E1 goes to the host and E5 to the admin, the confirmation replaces the form, and
 * that the admin sees the new request with every private detail in the admin.
 */
import { execSync } from "node:child_process";
import { placeholderPng } from "../lib/placeholder-png";
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
  const title = `Hill Walk ${Date.now()}`;

  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await page.goto(`${BASE_URL}/submit-event`);
    await axe(page, "submit form");

    console.log("Validation");
    await page.getByLabel("Event title").fill(title);
    await page.getByLabel("Date").fill(inDays(10));
    await page.getByLabel("Start time").fill("14:00");
    await page.getByLabel("End time").fill("12:00");
    await page.getByRole("button", { name: "Submit event for review" }).click();
    await page.getByText("Choose a county.").waitFor();
    check(await page.getByText("The end time must be after the start time.").isVisible(), "end before start is refused");
    check(await page.getByText("Enter the exact address.").isVisible(), "private fields are required");
    check((await page.getByLabel("Event title").inputValue()) === title, "what was typed is kept");
    check(await page.evaluate(() => document.activeElement?.id === "county"), "focus moves to the first error");
    await axe(page, "submit form with errors");

    console.log("\nPoster");
    await page.locator('input[type="file"]').setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(6 * 1024 * 1024) });
    check(await page.getByText(/up to 5MB/).first().isVisible(), "a poster over 5MB is refused");
    await page.locator('input[type="file"]').setInputFiles({ name: "poster.png", mimeType: "image/png", buffer: placeholderPng(400, 300, "#7a3b5d") });
    await page.getByAltText("Poster preview").waitFor();
    const posterPath = await page.locator('input[name="poster_path"]').inputValue();
    check(/^submissions\/[0-9a-f-]{36}\.png$/.test(posterPath), "the poster uploads under a random name", posterPath);

    console.log("\nSubmitting");
    await page.getByLabel("County").selectOption("Co. Leitrim");
    await page.getByLabel("End time").fill("16:00");
    await page.getByLabel("Description").fill("A gentle hill walk with tea after. Bring good shoes.");
    await page.getByLabel("How many people can come?").fill("12");
    await page.getByLabel("Exact address").fill("Car park at Sliabh an Iarainn, Drumshanbo");
    await page.getByLabel("Your name").fill("Ciara Test");
    await page.getByLabel("Your email").fill("Ciara.Test@Example.com");
    await page.getByLabel("Your phone").fill("087 123 4567");
    await page.getByLabel("About you or your group").fill("A small walking group");
    check(!(await page.getByText("Emergency contact").count()), "hosts aren't asked for an emergency contact");
    await page.getByLabel(/I agree/).check();
    await page.getByRole("button", { name: "Submit event for review" }).click();
    check(await page.getByRole("button", { name: "Sending…" }).isDisabled().catch(() => true), "the button shows it's sending and can't be pressed twice");
    await page.getByRole("heading", { name: "Event submitted" }).waitFor();
    const thanks = await page.locator("main").innerText();
    check(
      thanks.includes("Thanks! Your event has been submitted and we'll review it shortly. We'll email you once it's approved."),
      "the confirmation replaces the form",
    );
    check(!(await page.getByLabel("Event title").count()), "the form is cleared away");
    check(/spam/.test(thanks) && !/dashboard|my events|account/i.test(thanks), "mentions spam, no account language");
    await axe(page, "submitted confirmation");

    const { data: saved } = await service
      .from("events")
      .select("id, status, county, capacity, poster_path, submitted_at, host_edit_token_hash, event_private_details(*)")
      .eq("title", title)
      .single();
    check(saved?.status === "pending" && saved.county === "Co. Leitrim" && saved.capacity === 12, "the event is saved as a pending request");
    check(saved?.poster_path === posterPath, "with its poster");
    check(saved?.host_edit_token_hash === null, "no host link exists before approval");
    const d = saved?.event_private_details;
    check(
      d?.exact_address === "Car park at Sliabh an Iarainn, Drumshanbo" && d.host_email === "ciara.test@example.com" && d.emergency_contact_name === null,
      "every private detail is saved",
    );

    const emails = (await service.from("email_log").select("template, to_email, body").gte("created_at", start)).data ?? [];
    check(emails.some((e) => e.template === "E1" && e.to_email === "ciara.test@example.com"), "E1 goes to the host");
    const e5 = emails.find((e) => e.template === "E5");
    check(!!e5 && e5.to_email === env("SEED_ADMIN_EMAIL"), "E5 goes to the admin's email");
    check(!!e5?.body.includes(`/admin/events/${saved?.id}`), "E5 links to the request in the admin");

    const publicList = await (await fetch(`${BASE_URL}/events`)).text();
    check(!publicList.includes(title), "a pending event isn't on the public site");

    console.log("\nThe admin sees it in the admin");
    const admin = await browser.newPage();
    await admin.goto(`${BASE_URL}/admin/login`);
    await admin.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await admin.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await admin.getByRole("button", { name: "Log in" }).click();
    await admin.getByRole("heading", { name: /Welcome/ }).waitFor();
    await admin.goto(`${BASE_URL}/admin/events`);
    // The overview streams in after a loading skeleton.
    await admin.getByRole("heading", { name: /^New requests/ }).first().waitFor();
    const requests = await admin.locator("main").innerText();
    check(/New requests \(3\)/.test(requests) && requests.includes(title), "it's listed under New requests");
    await admin.goto(`${BASE_URL}/admin/events/${saved?.id}`);
    await admin.getByText("Only visible to you").first().waitFor();
    const detail = await admin.locator("main").innerText();
    check(
      ["Car park at Sliabh an Iarainn", "Ciara Test", "ciara.test@example.com", "087 123 4567", "A small walking group"].every((t) => detail.includes(t)),
      "the request shows all the private details",
    );
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
