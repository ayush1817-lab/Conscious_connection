/**
 * npm run test:host  (public site milestone 5)
 *
 * Needs the app running. Re-seeds first. Uses the seed's fixed test links to
 * check the private host page: invalid, cleared and old links all show the same
 * H5 page; a needs-changes event can be fixed and resubmitted (E5); a live event
 * can be edited with a before/after diff (E6), locked fields can't be changed
 * even by a tampered form, registrants show by name only, contact details can be
 * requested once (E7), and cancelling emails everyone (E9, E7). Every host
 * action then shows up in the admin's Attention items.
 */
import { execSync } from "node:child_process";
import { hashHostToken } from "../../lib/events/host-token";
import { env, serviceClient } from "../lib/env";
import { TEST_HOST_TOKENS } from "../lib/test-tokens";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();
const live = `${BASE_URL}/host/${TEST_HOST_TOKENS.live}`;
const needsChanges = `${BASE_URL}/host/${TEST_HOST_TOKENS.needsChanges}`;

async function eventByToken(token: string) {
  const { data } = await service
    .from("events")
    .select("id, title, status, description, start_at, capacity, event_private_details(exact_address, host_phone)")
    .eq("host_edit_token_hash", hashHostToken(token))
    .single();
  if (!data) throw new Error("Seed data is missing a test host link.");
  return data;
}

async function emails(template: string, since: string) {
  return (await service.from("email_log").select("to_email, subject, body").eq("template", template).gte("created_at", since)).data ?? [];
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });
  const start = new Date().toISOString();
  const drum = await eventByToken(TEST_HOST_TOKENS.live);
  const pottery = await eventByToken(TEST_HOST_TOKENS.needsChanges);

  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });

    console.log("Links that don't work (H5)");
    const bodies: string[] = [];
    const statuses: number[] = [];
    // Old: a link replaced by a newer one. Cleared: the Beach Clean event's link is set to null.
    const { data: beach } = await service.from("events").select("id").eq("title", "Beach Clean & Connect").single();
    await service.from("events").update({ host_edit_token_hash: hashHostToken("old-link".padEnd(43, "x")) }).eq("id", beach!.id);
    await service.from("events").update({ host_edit_token_hash: hashHostToken("cleared-link".padEnd(43, "x")) }).eq("id", beach!.id);
    for (const [label, token] of [
      ["made-up", "nonsense"],
      ["well-formed but unknown", "z".repeat(43)],
      ["replaced by a newer link", "old-link".padEnd(43, "x")],
      ["for an ended event", "cleared-link".padEnd(43, "x")],
    ]) {
      const res = await page.goto(`${BASE_URL}/host/${token}`);
      statuses.push(res?.status() ?? 0);
      const text = await page.locator("main").innerText();
      bodies.push(text);
      check(text.includes("This link is no longer active"), `a ${label} link shows H5`);
    }
    check(statuses.every((s) => s === 404) && bodies.every((b) => b === bodies[0]), "every broken link gets the identical page and status");
    check(await page.getByRole("link", { name: "Send me a new link" }).isVisible(), "H5 links to the resend page");
    const headers = (await fetch(live)).headers;
    check(headers.get("referrer-policy") === "no-referrer", "host pages send Referrer-Policy: no-referrer");
    check((headers.get("x-robots-tag") ?? "").includes("noindex"), "host pages aren't indexed");

    console.log("\nNeeds changes: fix and resubmit");
    await page.goto(needsChanges);
    check(await page.getByText("Please add what people should bring").isVisible(), "Karina's reason is at the top");
    await axe(page, "host page (needs changes)");
    await page.getByLabel("Description").fill("Try hand-building with clay. Bring an apron; materials cost €10.");
    await page.getByRole("button", { name: "Resubmit for review" }).click();
    await page.getByText("Waiting for Karina's review").waitFor();
    const resubmitted = await eventByToken(TEST_HOST_TOKENS.needsChanges);
    check(resubmitted.status === "pending" && resubmitted.description.includes("€10"), "the event is pending again with the fix");
    check((await emails("E5", start)).some((e) => e.body.includes("resubmitted")), "E5 tells Karina it was resubmitted");
    check(await page.getByText("Your changes have been sent to Karina").isVisible(), "the host sees it was sent");
    check(!(await page.getByRole("button", { name: /Resubmit|Save/ }).count()), "a pending event is read-only");

    console.log("\nLive: edit");
    await page.goto(live);
    check(await page.getByText("Live · 2 registered").isVisible(), "the status bar shows Live and the count");
    await axe(page, "host page (live)");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByText("Nothing has changed").waitFor();
    check(true, "saving with no changes says so");

    // Tamper with a locked field: make the date editable and change it.
    await page.getByLabel("Date").evaluate((el: HTMLInputElement) => {
      el.removeAttribute("readonly");
      el.value = "2030-01-01";
    });
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByText("can't be changed because people have already registered").first().waitFor();
    check((await eventByToken(TEST_HOST_TOKENS.live)).start_at === drum.start_at, "a tampered locked date is refused by the server");

    await page.goto(live, { waitUntil: "networkidle" }); // let the form hydrate before typing
    await page.getByLabel("Description").fill("No experience needed. Drums provided. Tea after!");
    await page.getByLabel("Your phone").fill("087 999 8888");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByText("Saved. Your changes are live").waitFor();
    const edited = await eventByToken(TEST_HOST_TOKENS.live);
    check(edited.description === "No experience needed. Drums provided. Tea after!" && edited.event_private_details?.host_phone === "087 999 8888", "the changes are saved");
    const { data: edit } = await service.from("event_edits").select("id, changes").eq("event_id", drum.id).single();
    const changed = Object.keys((edit?.changes ?? {}) as object).sort();
    check(changed.join() === "description,host_phone", "the diff holds only the changed fields", changed.join());
    const { data: editItem } = await service.from("attention_items").select("id, needs_decision").eq("ref_id", edit!.id).single();
    check(!!editItem && editItem.needs_decision === false, "a host_edited attention item is created");
    const e6 = await emails("E6", start);
    check(e6.length === 1 && e6[0].body.includes("Tea after!") && e6[0].body.includes(`/admin/attention/${editItem?.id}`), "E6 shows before → after and links to it");
    const publicPage = await (await fetch(`${BASE_URL}/events/${drum.id}`)).text();
    check(publicPage.includes("Tea after!"), "the edit is live on the public page straight away");

    console.log("\nRegistrations");
    await page.goto(`${live}?tab=registrations`);
    const regs = await page.locator("main").innerText();
    const { data: people } = await service.from("registrations").select("name, email").eq("event_id", drum.id);
    check(people!.every((p) => regs.includes(p.name)) && people!.every((p) => !regs.includes(p.email)), "names are listed, emails are not");

    console.log("\nContact request");
    await page.goto(`${live}?tab=contact`);
    await page.getByRole("button", { name: "Request contact details" }).click();
    await page.getByText("Tell Karina why").waitFor();
    check(true, "a reason is required");
    await page.getByLabel(/Why do you need/).fill("The meeting point has moved.");
    await page.getByRole("button", { name: "Request contact details" }).click();
    await page.getByText("Request sent").waitFor();
    check(await page.getByText("Waiting for Karina").isVisible(), "the request shows as waiting");
    check(!(await page.getByRole("button", { name: "Request contact details" }).count()), "only one open request at a time");
    const { data: request } = await service.from("contact_requests").select("id, status").eq("event_id", drum.id).single();
    const { data: requestItem } = await service.from("attention_items").select("id, needs_decision").eq("ref_id", request!.id).single();
    check(request?.status === "requested" && requestItem?.needs_decision === true, "a contact request needing a decision is created");
    check((await emails("E7", start)).some((e) => e.subject.startsWith("Contact details request")), "E7 tells Karina");

    console.log("\nKarina sees every host action");
    const admin = await browser.newPage();
    await admin.goto(`${BASE_URL}/admin/login`);
    await admin.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await admin.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await admin.getByRole("button", { name: "Log in" }).click();
    await admin.getByRole("heading", { name: /Welcome/ }).waitFor();
    await admin.goto(`${BASE_URL}/admin/events`);
    const overview = await admin.locator("main").innerText();
    check(/Attention items \(5\)/.test(overview), "the attention count includes the host's edit and request", overview.match(/Attention items \(\d+\)/)?.[0]);
    check(await admin.locator(`a[href="/admin/attention/${editItem!.id}"]`).first().isVisible(), "the host edit is listed");
    check(await admin.locator(`a[href="/admin/attention/${requestItem!.id}"]`).first().isVisible(), "the contact request is listed");
    await admin.goto(`${BASE_URL}/admin/attention/${editItem!.id}`);
    check(
      await admin.getByText("087 999 8888").first().waitFor({ timeout: 10_000 }).then(() => true, () => false),
      "the edit page shows before and after",
    );

    console.log("\nCancel (H4)");
    await page.goto(live);
    await page.getByRole("button", { name: "Cancel event" }).click();
    const dialog = page.getByRole("dialog");
    check(await dialog.getByText("The 2 people registered will be emailed. This can't be undone.").isVisible(), "the dialog gives the count and warns");
    check(await dialog.getByRole("button", { name: "Keep event" }).isVisible(), "the dialog offers Keep event");
    await axe(page, "cancel dialog");
    await dialog.getByRole("button", { name: "Cancel event" }).click();
    await page.waitForURL(/\/host\/cancelled/);
    check(await page.getByText("We've emailed the 2 people").isVisible(), "the host sees the cancelled state");
    check((await eventByToken(TEST_HOST_TOKENS.live)).status === "cancelled", "the event is cancelled");
    const e9 = (await emails("E9", start)).map((e) => e.to_email).sort();
    check(e9.join() === people!.map((p) => p.email).sort().join(), "E9 goes to every registrant");
    check((await emails("E7", start)).some((e) => e.subject.startsWith("Host cancelled")), "E7 tells Karina");
    const { data: cancelItem } = await service.from("attention_items").select("id").eq("event_id", drum.id).eq("type", "host_cancelled").is("resolved_at", null).single();
    check(!!cancelItem, "a host_cancelled attention item is created");
    const { data: activity } = await service.from("event_activity").select("actor").eq("event_id", drum.id).eq("action", "Cancelled").single();
    check(activity?.actor === "host", "the activity log says the host cancelled");
    await admin.goto(`${BASE_URL}/admin/events`);
    check(await admin.locator(`a[href="/admin/attention/${cancelItem!.id}"]`).first().waitFor({ timeout: 10_000 }).then(() => true, () => false), "the cancellation is listed in the admin");
    const res = await page.goto(live);
    check(res?.status() === 404 && (await page.getByText("This link is no longer active").isVisible()), "the link shows H5 after cancelling");
    const listing = await (await fetch(`${BASE_URL}/events`)).text();
    check(!listing.includes(drum.title), "the cancelled event is gone from the public site");
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
