/**
 * npm run test:gallery-photos  (Karina's feedback, round two)
 *
 * Needs the app running. Re-seeds first. Checks:
 * - Community Guidelines: the page says "coming soon" until the admin writes
 *   the guidelines, the admin can edit both parts, and the event and story
 *   forms link to the right part.
 * - Host photos: from the private host page (at 360px) a host uploads photos
 *   with descriptions; consent is required; they're saved as pending in a
 *   private bucket; the admin is emailed (G1); the admin approves one (with an
 *   edited caption) into the public gallery and declines the other (deleted);
 *   the host page shows each photo's status; after the event ends the link
 *   still opens, for photos only.
 */
import { execSync } from "node:child_process";
import { env, serviceClient } from "../lib/env";
import { placeholderPng } from "../lib/placeholder-png";
import { TEST_HOST_TOKENS } from "../lib/test-tokens";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();
const ok = (p: Promise<unknown>) => p.then(() => true, () => false);

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  await service.from("gallery_submissions").delete().not("id", "is", null);
  await service.from("site_sections").delete().eq("page", "guidelines");
  const start = new Date().toISOString();
  const browser = await launch();
  try {
    console.log("Community Guidelines");
    const pub = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await pub.goto(`${BASE_URL}/guidelines`);
    check(await pub.getByRole("heading", { name: "Community Guidelines", level: 1 }).isVisible(), "the page has its title");
    check((await pub.getByText("These guidelines are coming soon.").count()) === 2, "both parts say coming soon before any text is added");
    check(await pub.locator("#events").getByRole("heading", { name: "Hosting and attending events" }).isVisible(), "the events part has its own anchor");
    check(await pub.locator("#stories").getByRole("heading", { name: "Sharing stories and poetry" }).isVisible(), "the stories part has its own anchor");
    check((await pub.evaluate(() => document.documentElement.scrollWidth)) <= 360, "no sideways scrolling at 360px");
    await axe(pub, "guidelines page");
    await pub.goto(`${BASE_URL}/submit-event`);
    check((await pub.getByRole("link", { name: "guidelines for events" }).getAttribute("href")) === "/guidelines#events", "the host form links to the event guidelines");
    await pub.goto(`${BASE_URL}/stories/share`);
    check((await pub.getByRole("link", { name: "guidelines for stories and poetry" }).getAttribute("href")) === "/guidelines#stories", "the story form links to the story guidelines");
    check(await pub.getByRole("contentinfo").getByRole("link", { name: "Community Guidelines" }).isVisible(), "the footer links to the guidelines");

    const admin = await browser.newPage();
    await admin.goto(`${BASE_URL}/admin/login`);
    await admin.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await admin.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await admin.getByRole("button", { name: "Log in" }).click();
    await admin.getByRole("heading", { name: /Welcome/ }).waitFor();
    await admin.goto(`${BASE_URL}/admin/content/guidelines`);
    const events = admin.getByRole("region", { name: "Hosting and attending events" });
    await events.getByRole("button", { name: "Hosting and attending events" }).click();
    const long = "## Before your event\n\n* Be welcoming to everyone.\n* Share the meeting point.\n\n" + "Please be kind. ".repeat(250);
    await events.getByLabel("Guidelines").fill(long);
    await events.getByRole("button", { name: /Save/ }).click();
    check(await ok(admin.getByText("Saved. Your changes are live.").waitFor({ timeout: 8000 })), "long guidelines (over 3000 characters) save");
    await pub.goto(`${BASE_URL}/guidelines`);
    check(await pub.locator("#events").getByRole("heading", { name: "Before your event", level: 3 }).isVisible(), "a ## line is a sub-heading");
    check((await pub.locator("#events li").count()) === 2, "* lines are bullet points");
    check((await pub.getByText("These guidelines are coming soon.").count()) === 1, "the stories part still says coming soon");

    console.log("\nHost photos");
    const host = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await host.goto(`${BASE_URL}/host/${TEST_HOST_TOKENS.live}?tab=photos`);
    await host.getByRole("heading", { name: "Add photos from your event" }).waitFor();
    await host.waitForFunction(() => Object.keys(document.querySelector("form") ?? {}).some((k) => k.startsWith("__react")));
    await axe(host, "host photos tab");
    await host.locator('input[type="file"]').setInputFiles([
      { name: "one.png", mimeType: "image/png", buffer: placeholderPng(1600, 1200, "#775577") },
      { name: "two.png", mimeType: "image/png", buffer: placeholderPng(1200, 900, "#557755") },
    ]);
    await host.getByLabel("Describe photo 2").waitFor();
    await host.getByLabel("Describe photo 1").fill("Drummers in a circle");
    check((await host.evaluate(() => document.documentElement.scrollWidth)) <= 360, "no sideways scrolling at 360px");
    await host.getByRole("button", { name: "Send 2 photos for review" }).click();
    // The browser's own check stops it first; remove it to see ours.
    await host.locator("#consent").evaluate((el: HTMLInputElement) => el.removeAttribute("required"));
    await host.getByRole("button", { name: "Send 2 photos for review" }).click();
    check(await ok(host.getByText("Please tick the box to confirm").waitFor({ timeout: 5000 })), "consent is required");
    await host.getByLabel(/Everyone who can be recognised/).check();
    await host.getByRole("button", { name: "Send 2 photos for review" }).click();
    check(await ok(host.getByText("Your 2 photos have been sent").waitFor({ timeout: 8000 })), "the host sees they were sent");

    const { data: subs } = await service.from("gallery_submissions").select("*").order("created_at");
    check(subs?.length === 2 && subs.every((s) => s.status === "pending" && s.event_title === "Community Drum Circle"), "saved as 2 pending photos for the event");
    check(subs?.some((s) => s.caption === "Drummers in a circle") ?? false, "with the description");
    const path = subs?.[0]?.image_path ?? "";
    const publicTry = await fetch(`${env("NEXT_PUBLIC_SUPABASE_URL")}/storage/v1/object/public/gallery-submissions/${path}`);
    check(publicTry.status >= 400, "the photos aren't public before approval", String(publicTry.status));
    const anon = await fetch(`${env("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/gallery_submissions?select=id`, {
      headers: { apikey: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), Authorization: `Bearer ${env("NEXT_PUBLIC_SUPABASE_ANON_KEY")}` },
    });
    check(anon.status === 401 || anon.status === 403 || (await anon.json()).length === 0, "the public can't list submissions", String(anon.status));
    const emails = (await service.from("email_log").select("template, to_email, body").gte("created_at", start)).data ?? [];
    check(emails.some((e) => e.template === "G1" && e.to_email === env("SEED_ADMIN_EMAIL") && e.body.includes("/admin/content/gallery")), "G1 tells the admin, with a link");
    await host.reload();
    check((await host.getByText("Waiting for our team").count()) === 2, "the host page lists both as waiting");

    console.log("\nReview in the admin");
    const { count: before } = await service.from("gallery_images").select("id", { count: "exact", head: true });
    await admin.goto(`${BASE_URL}/admin`);
    check(await ok(admin.getByText("2 photos to review.").waitFor({ timeout: 5000 })), "the admin home shows photos are waiting");
    await admin.goto(`${BASE_URL}/admin/content/gallery`);
    await admin.getByRole("heading", { name: "Photos to review (2)" }).waitFor();
    await axe(admin, "admin gallery review");
    const first = admin.getByRole("listitem").filter({ has: admin.getByRole("button", { name: "Approve and add to gallery" }) }).first();
    await first.getByLabel(/Caption/).fill("Our drum circle in Cork");
    await first.getByRole("button", { name: "Approve and add to gallery" }).click();
    check(await ok(admin.getByText("Approved. The photo is now in the gallery.").waitFor({ timeout: 8000 })), "approving confirms");
    const { data: image } = await service.from("gallery_images").select("id, image_path, caption").eq("caption", "Our drum circle in Cork").maybeSingle();
    const { count: after } = await service.from("gallery_images").select("id", { count: "exact", head: true });
    check(!!image && after === (before ?? 0) + 1, "it's added to the gallery with the edited caption");
    const shown = await fetch(`${env("NEXT_PUBLIC_SUPABASE_URL")}/storage/v1/object/public/gallery/${image?.image_path}`);
    check(shown.ok, "the gallery copy is public");
    const { data: approved } = await service.from("gallery_submissions").select("*").eq("status", "approved").single();
    check(approved?.gallery_image_id === image?.id && approved?.image_path === null, "the submission records the gallery image");
    await admin.getByRole("heading", { name: "Photos to review (1)" }).waitFor();
    await admin.getByRole("button", { name: "Decline" }).first().click();
    await admin.getByRole("dialog", { name: "Decline this photo?" }).getByRole("button", { name: "Yes, decline it" }).click();
    check(await ok(admin.getByText("Declined. The photo has been deleted.").waitFor({ timeout: 8000 })), "declining confirms");
    const { data: declined } = await service.from("gallery_submissions").select("*").eq("status", "declined").single();
    const declinedPath = subs?.find((s) => s.id === declined?.id)?.image_path ?? "";
    const { data: stillThere } = await service.storage.from("gallery-submissions").exists(declinedPath);
    check(!!declined && !stillThere, "the declined photo is deleted");
    check(!(await admin.getByRole("heading", { name: /Photos to review/ }).count()), "the review list is gone once empty");
    const gallery = await (await fetch(`${BASE_URL}/gallery`)).text();
    check(gallery.includes("Our drum circle in Cork"), "the approved photo is in the public gallery");
    await host.reload();
    check(await host.getByText("In the gallery").isVisible(), "the host sees the approved photo is in the gallery");
    check(await host.getByText("Not used").isVisible(), "and that the other wasn't used");

    console.log("\nAfter the event");
    const { data: drum } = await service.from("events").select("id, start_at, end_at, series_end_at").eq("title", "Community Drum Circle").single();
    const past = new Date(Date.now() - 2 * 86_400_000);
    await service
      .from("events")
      .update({ start_at: new Date(past.getTime() - 7_200_000).toISOString(), end_at: past.toISOString() })
      .eq("id", drum!.id);
    const { data: ended } = await service.from("events").select("series_end_at").eq("id", drum!.id).single();
    check(new Date(ended!.series_end_at).getTime() < Date.now(), "the test event has ended");
    await host.goto(`${BASE_URL}/host/${TEST_HOST_TOKENS.live}`);
    check(await ok(host.getByText("This event has finished").waitFor({ timeout: 5000 })), "the link still opens after the event");
    check(await host.getByRole("heading", { name: "Add photos from your event" }).isVisible(), "with the photo section");
    check(!(await host.getByRole("button", { name: "Cancel event" }).count()) && !(await host.getByRole("button", { name: "Save changes" }).count()), "but nothing else can be changed");
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
