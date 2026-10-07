/**
 * npm run test:a11y  (milestone 7 accessibility pass)
 *
 * Needs the app running. Re-seeds the database first. Runs axe-core (WCAG 2.1
 * A and AA rules) on every admin screen, logged out and logged in, on desktop
 * and at 360px, plus the open dialogs. Also checks keyboard basics: the skip
 * link, visible focus, and that dialogs take and return focus.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Page } from "playwright-core";
import { env, serviceClient } from "../lib/env";
import { BASE_URL, check, finish, launch } from "./browser";

const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const service = serviceClient();

type Violation = { id: string; impact: string; help: string; nodes: { target: string[] }[] };

async function axe(page: Page, label: string) {
  await page.addScriptTag({ content: AXE });
  const violations = (await page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: unknown[] }> } }).axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    });
    return result.violations;
  })) as Violation[];
  const detail = violations
    .map((v) => `${v.impact} ${v.id}: ${v.help} [${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}]`)
    .join("; ");
  check(violations.length === 0, `${label}: no accessibility problems`, detail);
}

async function idOf(query: PromiseLike<{ data: { id: string } | null }>) {
  const { data } = await query;
  if (!data) throw new Error("Seed data is missing a row the test needs.");
  return data.id;
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const pending = await idOf(service.from("events").select("id").eq("status", "pending").limit(1).single());
  const live = await idOf(
    service.from("events").select("id").eq("status", "live").gt("start_at", new Date().toISOString()).order("start_at").limit(1).single(),
  );
  const attention = await Promise.all(
    (["host_edited", "host_cancelled", "contact_request"] as const).map((type) =>
      idOf(service.from("attention_items").select("id").eq("type", type).limit(1).single()),
    ),
  );
  const story = await idOf(service.from("stories").select("id").limit(1).single());
  const podcast = await idOf(service.from("podcasts").select("id").limit(1).single());

  const pages = [
    "/admin",
    "/admin/events",
    `/admin/events/${pending}`,
    `/admin/events/${live}`,
    `/admin/events/${live}?tab=activity`,
    ...attention.map((id) => `/admin/attention/${id}`),
    "/admin/content/homepage",
    "/admin/content/stories",
    "/admin/content/stories/new",
    `/admin/content/stories/${story}`,
    "/admin/content/podcasts",
    "/admin/content/podcasts/new",
    `/admin/content/podcasts/${podcast}`,
    "/admin/content/gallery",
    "/admin/content/about",
    "/admin/events/00000000-0000-0000-0000-000000000000", // not found
  ];

  const browser = await launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Logged out");
    for (const path of ["/admin/login", "/admin/forgot-password"]) {
      await page.goto(`${BASE_URL}${path}`);
      await axe(page, path);
    }
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.getByRole("alert").first().waitFor();
    await axe(page, "login with errors");

    await page.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await page.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await page.getByRole("button", { name: "Log in" }).click();
    await page.getByRole("heading", { name: /Welcome/ }).waitFor();

    console.log("\nKeyboard");
    await page.goto(`${BASE_URL}/admin`);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    check(await skip.evaluate((el) => el === document.activeElement), "the first Tab lands on a skip link");
    check(await skip.isVisible(), "the skip link is visible when focused");
    await page.keyboard.press("Enter");
    check(await page.evaluate(() => document.activeElement?.id === "main"), "the skip link moves focus to the page content");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "none";
      const style = getComputedStyle(el);
      return `${style.outlineStyle} ${style.outlineWidth}`;
    });
    check(!outline.startsWith("none") && !outline.endsWith(" 0px"), "focused links have a visible outline", outline);

    await page.goto(`${BASE_URL}/admin/events/${pending}`);
    const decline = page.getByRole("button", { name: "Decline" });
    await decline.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    check(await dialog.evaluate((el) => el.contains(document.activeElement)), "opening a dialog moves focus into it");
    await axe(page, "decline dialog");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    check(await decline.evaluate((el) => el === document.activeElement), "closing a dialog returns focus to its button");

    console.log("\nEvery screen (desktop)");
    for (const path of pages) {
      await page.goto(`${BASE_URL}${path}`);
      await page.locator("main h1").first().waitFor();
      await axe(page, path);
    }

    await page.goto(`${BASE_URL}/admin/events/00000000-0000-0000-0000-000000000000`);
    check(await page.getByRole("heading", { name: "We can't find that page" }).isVisible(), "a missing event shows a friendly not-found page");

    await page.goto(`${BASE_URL}/admin/events/${live}`);
    await page.getByRole("button", { name: "Cancel event" }).click();
    await page.getByRole("dialog").waitFor();
    await axe(page, "cancel event dialog");

    console.log("\nEvery screen (360px)");
    const phone = await context.newPage();
    await phone.setViewportSize({ width: 360, height: 780 });
    for (const path of pages) {
      await phone.goto(`${BASE_URL}${path}`);
      await phone.locator("main h1").first().waitFor();
      await axe(phone, `${path} at 360px`);
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
