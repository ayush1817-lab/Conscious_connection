/**
 * npm run test:external  (client feedback, Oct 2026: external registration links)
 *
 * Needs the app running. Re-seeds first. Checks: the link is validated (only
 * http/https, a scheme is added when missing), an event with a link shows a
 * "Register here" button that opens it in a new tab with the note, and no RSVP
 * form; our RSVP is refused for it; and the admin editor can set and clear it.
 */
import { execSync } from "node:child_process";
import { normaliseUrl } from "../../lib/public/event-form";
import { env, serviceClient } from "../lib/env";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();
const LINK = "https://www.eventbrite.ie/e/pottery-taster-123?aff=cc";

function inDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });

  console.log("Checking links");
  check(normaliseUrl("eventbrite.ie/e/123") === "https://eventbrite.ie/e/123", "a missing https:// is added");
  check(normaliseUrl("javascript:alert(1)") === null, "javascript: links are refused");
  check(normaliseUrl("not a link") === null && normaliseUrl("https://localhost") === null, "things that aren't web addresses are refused");
  check(normaliseUrl(LINK) === LINK, "a normal link is kept as it is");

  const { data: pottery } = await service.from("events").select("id").eq("title", "Pottery Taster Evening").single();
  await service.from("events").update({ external_registration_url: LINK }).eq("id", pottery!.id);

  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    console.log("\nEvent page");
    await page.goto(`${BASE_URL}/events/${pottery!.id}`);
    const register = page.locator("#register");
    const button = register.getByRole("link", { name: /Register here/ });
    check((await button.getAttribute("href")) === LINK, "Register here links to the other site");
    check((await button.getAttribute("target")) === "_blank" && ((await button.getAttribute("rel")) ?? "").includes("noopener"), "it opens in a new tab, safely");
    check(await register.getByText("This event requires registration via an external site").isVisible(), "the note is shown");
    check((await register.getByLabel("Your name").count()) === 0, "our RSVP form is not shown");
    check(!(await page.locator("main").innerText()).includes("place left"), "no places left are shown for it");
    await axe(page, "event with an external registration link");
    const { data: refused } = await service.rpc("register_for_event", { p_event_id: pottery!.id, p_name: "Test", p_email: "external@example.com" });
    check(refused === "external", "our own registration is refused for it", String(refused));

    console.log("\nSubmitting with a link");
    const title = `Craft Fair ${Date.now()}`;
    await page.goto(`${BASE_URL}/submit-event`);
    await page.getByLabel("Event title").fill(title);
    await page.getByLabel("County").selectOption("Co. Mayo");
    await page.getByLabel("Date", { exact: true }).fill(inDays(12));
    await page.getByLabel("Start time").fill("10:00");
    await page.getByLabel("End time").fill("16:00");
    await page.getByLabel("Description").fill("Local makers and a cuppa.");
    await page.getByLabel("Registration link (optional)").fill("javascript:alert(1)");
    await page.getByLabel("Exact address").fill("Parish Hall, Westport");
    await page.getByLabel("Your name").fill("Gráinne Test");
    await page.getByLabel("Your email").fill("grainne@example.com");
    await page.getByLabel("Your phone").fill("087 123 4567");
    await page.getByLabel("About you or your group").fill("Makers' group");
    await page.getByLabel(/I agree/).check();
    await page.getByRole("button", { name: "Submit event for review" }).click();
    await page.getByText("Enter a full web address").waitFor();
    check(true, "a javascript: link is refused with a clear message");
    await page.getByLabel("Registration link (optional)").fill("tickets.example.ie/craft-fair");
    await page.getByLabel(/I agree/).check();
    await page.getByRole("button", { name: "Submit event for review" }).click();
    await page.getByRole("heading", { name: "Event submitted" }).waitFor();
    const { data: saved } = await service.from("events").select("id, external_registration_url").eq("title", title).single();
    check(saved?.external_registration_url === "https://tickets.example.ie/craft-fair", "the link is saved with https://", saved?.external_registration_url ?? "");

    console.log("\nAdmin editor");
    const admin = await browser.newPage();
    await admin.goto(`${BASE_URL}/admin/login`);
    await admin.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await admin.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await admin.getByRole("button", { name: "Log in" }).click();
    await admin.getByRole("heading", { name: /Welcome/ }).waitFor();
    await admin.goto(`${BASE_URL}/admin/events/${saved!.id}`);
    check(await admin.getByRole("link", { name: "https://tickets.example.ie/craft-fair" }).isVisible(), "the admin sees the link when reviewing");
    await admin.goto(`${BASE_URL}/admin/events/${pottery!.id}/edit`);
    check((await admin.getByLabel("Registration link (optional)").inputValue()) === LINK, "the editor shows the link");
    await admin.getByLabel("Registration link (optional)").fill("");
    await admin.getByRole("button", { name: "Save changes" }).click();
    await admin.waitForURL(`${BASE_URL}/admin/events/${pottery!.id}`);
    const { data: cleared } = await service.from("events").select("external_registration_url").eq("id", pottery!.id).single();
    check(cleared?.external_registration_url === null, "clearing the link brings our own RSVP back");
    await page.goto(`${BASE_URL}/events/${pottery!.id}`);
    check((await page.locator("#register").getByLabel("Your name").count()) === 1, "the RSVP form is back");
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
