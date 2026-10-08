/**
 * npm run test:resend  (public site milestone 6, H6)
 *
 * Needs the app running. Re-seeds first. Checks that asking for a new host link
 * gives the identical reply whether or not the email belongs to a host; that a
 * host gets a fresh link per active event (E4 for live, E2 for needs changes),
 * the new link works and the old one doesn't; that ended, cancelled and pending
 * events get nothing; and that the hourly limit applies.
 */
import { execSync } from "node:child_process";
import type { Page } from "playwright-core";
import { serviceClient } from "../lib/env";
import { TEST_HOST_TOKENS } from "../lib/test-tokens";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();

// Each section starts with a clean hourly count for this visitor.
async function resetLimits() {
  await service.from("rate_limits").delete().not("key", "is", null);
}

// Wait until React has taken over the form, so it submits in the page.
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return !!form && Object.keys(form).some((k) => k.startsWith("__react"));
  });
}

async function ask(page: Page, email: string) {
  await page.goto(`${BASE_URL}/host/resend`);
  await hydrated(page);
  await page.getByLabel(/The email you used/).fill(email);
  // Fetch the server action ourselves so its reply body can be compared.
  let body = "";
  await page.route(`${BASE_URL}/host/resend`, async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const response = await route.fetch();
    body = await response.text();
    await route.fulfill({ response, body });
  });
  await page.getByRole("button", { name: "Send me my link" }).click();
  await page.getByRole("status").waitFor();
  await page.unroute(`${BASE_URL}/host/resend`);
  return { body, text: await page.locator("main").innerText() };
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const start = new Date().toISOString();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await page.goto(`${BASE_URL}/host/resend`);
    await hydrated(page);
    await axe(page, "resend page");

    console.log("Same reply either way");
    const host = await ask(page, "Ciara@Example.com"); // hosts the live Drum Circle
    const stranger = await ask(page, "nobody-here@example.com");
    check(host.text === stranger.text, "the page says exactly the same for a host and a stranger");
    check(!!host.body && host.body === stranger.body, "the server's response is byte-for-byte the same");
    check(host.text.includes("If there's an active event for this email, we've sent the link."), "the message is the one from the spec");

    // Emails are sent after the response; give them a moment.
    await page.waitForTimeout(1500);
    const sent = (await service.from("email_log").select("template, to_email, body").gte("created_at", start)).data ?? [];
    const e4 = sent.filter((e) => e.template === "E4" && e.to_email === "ciara@example.com");
    check(e4.length === 1, "the host gets one E4 with a new link", `${e4.length} sent`);
    check(!sent.some((e) => e.to_email === "nobody-here@example.com"), "a stranger gets nothing");
    const newLink = e4[0]?.body.match(/\/host\/([A-Za-z0-9_-]{43})/)?.[1];
    check(!!newLink && newLink !== TEST_HOST_TOKENS.live, "the email holds a fresh link");
    const fresh = await page.goto(`${BASE_URL}/host/${newLink}`);
    check(fresh?.status() === 200 && (await page.getByText("Live ·").isVisible()), "the new link works");
    const old = await page.goto(`${BASE_URL}/host/${TEST_HOST_TOKENS.live}`);
    check(old?.status() === 404, "the old link no longer works");

    console.log("\nNeeds changes, and events that get nothing");
    await resetLimits();
    await ask(page, "orla@example.com"); // hosts Pottery for Beginners (needs changes)
    await page.waitForTimeout(1500);
    const e2 = ((await service.from("email_log").select("template, to_email, body").gte("created_at", start)).data ?? []).filter(
      (e) => e.to_email === "orla@example.com",
    );
    check(e2.length === 1 && e2[0].template === "E2", "a needs-changes event gets E2 with a new link");
    const pottery = e2[0]?.body.match(/\/host\/([A-Za-z0-9_-]{43})/)?.[1];
    await page.goto(`${BASE_URL}/host/${pottery}`);
    check(await page.getByText("Karina asked for a few changes").isVisible(), "that link opens the needs-changes page");

    await ask(page, "mary@example.com"); // pending request and an ended event only
    await page.waitForTimeout(1500);
    check(
      !((await service.from("email_log").select("id").eq("to_email", "mary@example.com").gte("created_at", start)).data ?? []).length,
      "pending and ended events get no link",
    );

    console.log("\nLimit");
    await resetLimits();
    for (let i = 0; i < 3; i++) await ask(page, "someone@example.com");
    await page.goto(`${BASE_URL}/host/resend`);
    await hydrated(page);
    await page.getByLabel(/The email you used/).fill("someone@example.com");
    await page.getByRole("button", { name: "Send me my link" }).click();
    check(await page.getByRole("alert").waitFor().then(() => true, () => false), "a 4th request in an hour is refused");
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
