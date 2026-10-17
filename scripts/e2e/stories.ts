/**
 * npm run test:stories  (client feedback task 7)
 *
 * Needs the app running. Re-seeds first. Shares a story from /stories/share at
 * 360px and checks: the Stories page links to the form, errors are shown,
 * the confirmation replaces the form, the submission is private and pending,
 * S1 goes to the writer and S2 to the admin, approving publishes it with the
 * writer's name and emails S3, declining needs a reason and emails S4, the
 * honeypot and the hourly limit.
 */
import { execSync } from "node:child_process";
import { env, serviceClient } from "../lib/env";
import { placeholderPng } from "../lib/placeholder-png";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();
const BODY = "When I moved to the west I didn't know a soul. A friend sent me the events page and I went to a walk on my own.\n\nNow I host one.";

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const start = new Date().toISOString();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await page.goto(`${BASE_URL}/stories`);
    await page.getByRole("link", { name: "Share your story" }).click();
    await page.waitForURL(`${BASE_URL}/stories/share`);
    await page.waitForFunction(() => Object.keys(document.querySelector("form") ?? {}).some((k) => k.startsWith("__react")));
    await axe(page, "share your story form");

    console.log("Validation");
    await page.getByRole("button", { name: "Send my story" }).click();
    await page.getByText("Enter a title.").waitFor();
    check(await page.getByText("Enter your email address.").isVisible(), "email is required");
    check(await page.getByText("Please tick the box to agree").isVisible(), "consent is required");

    console.log("\nSharing");
    await page.getByLabel("Title").fill("Finding my feet in Mayo");
    await page.getByLabel("Your story", { exact: true }).fill(BODY);
    await page.locator('input[type="file"]').setInputFiles({ name: "walk.png", mimeType: "image/png", buffer: placeholderPng(1200, 800, "#557755") });
    await page.getByAltText("Image preview").waitFor();
    await page.getByLabel("Name to show with your story").fill("Aoife");
    await page.getByLabel("Your email").fill("Aoife@Example.com");
    await page.getByLabel(/I agree/).check();
    await page.getByRole("button", { name: "Send my story" }).click();
    await page.getByRole("heading", { name: "Story sent" }).waitFor();
    check(!(await page.getByLabel("Title").count()), "the confirmation replaces the form");

    const { data: sub } = await service.from("story_submissions").select("*").eq("title", "Finding my feet in Mayo").single();
    check(sub?.status === "pending" && sub.email === "aoife@example.com" && sub.author_name === "Aoife", "saved as a pending submission");
    check(!!sub?.image_path?.startsWith("story-submissions/"), "with its photo");
    const anon = await fetch(`${env("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/story_submissions?select=email`, {
      headers: { apikey: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), Authorization: `Bearer ${env("NEXT_PUBLIC_SUPABASE_ANON_KEY")}` },
    });
    check(anon.status === 401 || anon.status === 403 || (await anon.json()).length === 0, "the public can't read submissions", String(anon.status));
    const list = await (await fetch(`${BASE_URL}/stories`)).text();
    check(!list.includes("Finding my feet in Mayo"), "a pending story isn't on the website");

    const emails = async () => (await service.from("email_log").select("template, to_email, body").gte("created_at", start)).data ?? [];
    let sent = await emails();
    check(sent.some((e) => e.template === "S1" && e.to_email === "aoife@example.com"), "S1 thanks the writer");
    check(sent.some((e) => e.template === "S2" && e.to_email === env("SEED_ADMIN_EMAIL") && e.body.includes(`/admin/content/stories/submissions/${sub?.id}`)), "S2 tells the admin, with a link");

    console.log("\nSpam protection");
    const bot = await browser.newPage();
    await bot.goto(`${BASE_URL}/stories/share`);
    await bot.waitForFunction(() => Object.keys(document.querySelector("form") ?? {}).some((k) => k.startsWith("__react")));
    await bot.getByLabel("Title").fill("Bot story");
    await bot.getByLabel("Your story", { exact: true }).fill(BODY);
    await bot.getByLabel("Your email").fill("bot@example.com");
    await bot.getByLabel(/I agree/).check();
    await bot.locator("#website").evaluate((el: HTMLInputElement) => (el.value = "spam")).catch(() => undefined);
    await bot.evaluate(() => {
      const hp = document.querySelector<HTMLInputElement>('div[aria-hidden] input[type="text"]');
      if (hp) hp.value = "https://spam.example";
    });
    await bot.getByRole("button", { name: "Send my story" }).click();
    await bot.getByRole("heading", { name: "Story sent" }).waitFor();
    const { count: botRows } = await service.from("story_submissions").select("id", { count: "exact", head: true }).eq("title", "Bot story");
    check(botRows === 0, "a bot that fills the hidden field sees success but nothing is saved");
    await bot.close();

    console.log("\nReview in the admin");
    const admin = await browser.newPage();
    await admin.goto(`${BASE_URL}/admin/login`);
    await admin.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await admin.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await admin.getByRole("button", { name: "Log in" }).click();
    await admin.getByRole("heading", { name: /Welcome/ }).waitFor();
    check(await admin.getByText("1 shared story to review.").isVisible(), "the admin home shows a story is waiting");
    await admin.goto(`${BASE_URL}/admin/content/stories`);
    await admin.getByRole("heading", { name: /waiting for review \(1\)/ }).waitFor();
    await admin.getByRole("link", { name: /Finding my feet in Mayo/ }).click();
    await admin.getByRole("link", { name: "aoife@example.com" }).waitFor();
    await admin.getByRole("button", { name: "Approve and publish" }).click();
    await admin.waitForURL(/\/admin\/content\/stories\/[0-9a-f-]{36}$/);
    check(
      await admin.getByText("Published. The story is now on the website, and the writer has been emailed.").waitFor({ timeout: 5000 }).then(() => true, () => false),
      "approving publishes and says the writer was emailed",
    );
    const { data: story } = await service.from("stories").select("slug, published, author_name, cover_path").eq("title", "Finding my feet in Mayo").single();
    check(!!story?.published && story.author_name === "Aoife" && story.cover_path === sub?.image_path, "it's a published story with the name and photo");
    const pub = await browser.newPage();
    await pub.goto(`${BASE_URL}/stories/${story?.slug}`);
    check(await pub.getByText("By Aoife").isVisible(), "the story page shows who wrote it");
    check(!(await pub.content()).includes("aoife@example.com"), "and never the email");
    await pub.close();
    sent = await emails();
    check(sent.some((e) => e.template === "S3" && e.to_email === "aoife@example.com" && e.body.includes(`/stories/${story?.slug}`)), "S3 tells the writer, with a link");

    console.log("\nDeclining");
    const { data: second } = await service
      .from("story_submissions")
      .insert({ title: "Second story", body: BODY, email: "anon@example.com" })
      .select("id")
      .single();
    await admin.goto(`${BASE_URL}/admin/content/stories/submissions/${second?.id}`);
    check(await admin.getByText("Anonymous").waitFor({ timeout: 5000 }).then(() => true, () => false), "an anonymous story says so");
    await admin.getByRole("button", { name: "Decline" }).click();
    const dialog = admin.getByRole("dialog", { name: "Decline this story" });
    await dialog.getByRole("button", { name: "Send and decline" }).click();
    check(await dialog.getByText("Please write a reason").waitFor({ timeout: 5000 }).then(() => true, () => false), "declining needs a reason");
    await dialog.getByLabel(/Explain your decision to the writer/).fill("It names other people without their permission.");
    await dialog.getByRole("button", { name: "Send and decline" }).click();
    await admin.waitForURL(`${BASE_URL}/admin/content/stories`);
    check(await admin.getByText("Story declined. The writer has been emailed.").waitFor({ timeout: 5000 }).then(() => true, () => false), "declining confirms");
    sent = await emails();
    check(sent.some((e) => e.template === "S4" && e.to_email === "anon@example.com" && e.body.includes("without their permission")), "S4 gives the writer the reason");

    console.log("\nHourly limit");
    let limited = false;
    for (let i = 0; i < 4 && !limited; i++) {
      const p = await browser.newPage();
      await p.goto(`${BASE_URL}/stories/share`);
      await p.waitForFunction(() => Object.keys(document.querySelector("form") ?? {}).some((k) => k.startsWith("__react")));
      await p.getByLabel("Title").fill(`Limit ${i}`);
      await p.getByLabel("Your story", { exact: true }).fill(BODY);
      await p.getByLabel("Your email").fill("limit@example.com");
      await p.getByLabel(/I agree/).check();
      await p.getByRole("button", { name: "Send my story" }).click();
      await p.getByRole("heading", { name: "Story sent" }).or(p.getByText("You've sent this form a lot")).first().waitFor();
      limited = await p.getByText("You've sent this form a lot").isVisible();
      await p.close();
    }
    check(limited, "a visitor can share 3 stories an hour");
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
