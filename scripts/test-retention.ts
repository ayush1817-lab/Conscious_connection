/**
 * npm run test:retention  (milestone 7: data retention, spec section 6)
 *
 * Re-seeds the database (which has an event that ended 10 days ago), then adds
 * events that ended 30 days, 8 days and 6 days ago, each with full private data. Runs the cleanup and checks it removes
 * only the private data of events that ended more than 7 days ago, keeps the
 * event rows, logs the run, can be re-run safely, and that only the service role
 * can run it. Also checks email records are deleted after 30 days. If the app is running, also checks the /api/cron/retention route.
 * Re-seeds again at the end.
 */
import { execSync } from "node:child_process";
import { runRetention } from "../lib/events/retention";
import { anonClient, env, serviceClient } from "./lib/env";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const service = serviceClient();
const DAY = 24 * 60 * 60 * 1000;

let failures = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${!ok && detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

// An event that ended `daysAgo` days ago with every kind of private data.
async function eventEnded(daysAgo: number, title: string) {
  const end = new Date(Date.now() - daysAgo * DAY);
  const { data: event, error } = await service
    .from("events")
    .insert({
      title,
      county: "Co. Clare",
      start_at: new Date(end.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      end_at: end.toISOString(),
      description: "Retention test event.",
      status: "live",
      approved_at: new Date(end.getTime() - 20 * DAY).toISOString(),
      host_edit_token_hash: `retention-test-${daysAgo}-${Date.now()}`,
    })
    .select("id")
    .single();
  if (error) throw error;
  const event_id = event.id;
  await service.from("event_private_details").insert({
    event_id,
    exact_address: "Car park, Main Street, Ennistymon",
    host_name: "Retention Host",
    host_email: "retention-host@example.com",
    host_phone: "087 000 0000",
    about_group: "Test group",
    emergency_contact_name: "Someone",
    emergency_contact_phone: "087 111 1111",
  });
  await service.from("registrations").insert([
    { event_id, name: "Aoife", email: "aoife-retention@example.com", consented_at: end.toISOString() },
    { event_id, name: "Sam", email: "sam-retention@example.com", consented_at: end.toISOString() },
  ]);
  const { data: edit } = await service
    .from("event_edits")
    .insert({ event_id, changes: { title: { before: "Old", after: title } } })
    .select("id")
    .single();
  const { data: request } = await service
    .from("contact_requests")
    .insert({ event_id, host_reason: "To send reminders" })
    .select("id")
    .single();
  const { error: attentionError } = await service.from("attention_items").insert([
    { event_id, type: "host_edited", ref_id: edit!.id, needs_decision: false },
    { event_id, type: "contact_request", ref_id: request!.id, needs_decision: true },
  ]);
  if (attentionError) throw attentionError;
  return event_id;
}

// What eventEnded() creates: 2 registrations, host details, a contact request, a host edit and 2 attention items.
const ROWS_PER_EVENT = 7;
const PRIVATE_TABLES = ["registrations", "event_private_details", "contact_requests", "event_edits", "attention_items"] as const;

// Row counts in every private table for some events (or for all events but some).
async function privateRows(filter: { only?: string | string[]; except?: string[] }) {
  const counts: Record<string, number> = {};
  for (const table of PRIVATE_TABLES) {
    let query = service.from(table).select("id", { count: "exact", head: true });
    if (filter.only) query = query.in("event_id", ([] as string[]).concat(filter.only));
    if (filter.except) query = query.not("event_id", "in", `(${filter.except.join(",")})`);
    const { count, error } = await query;
    if (error) throw error;
    counts[table] = count ?? 0;
  }
  return counts;
}

const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

async function main() {
  execSync("npm run seed", { stdio: "ignore" });

  const old = await eventEnded(30, "Retention test: ended 30 days ago");
  const justOver = await eventEnded(8, "Retention test: ended 8 days ago");
  const justUnder = await eventEnded(6, "Retention test: ended 6 days ago");
  // The seed includes an event that ended 10 days ago; it is due for cleanup too.
  const { data: due } = await service.from("events").select("id, title").lt("end_at", new Date(Date.now() - 7 * DAY).toISOString());
  const dueIds = due!.map((e) => e.id);
  const seededDue = due!.filter((e) => e.id !== old && e.id !== justOver);
  check(seededDue.length > 0, "the seed has an event that ended more than 7 days ago", JSON.stringify(seededDue));
  const dueBefore = await privateRows({ only: dueIds });
  const keepBefore = await privateRows({ except: dueIds });
  check(total(await privateRows({ only: seededDue.map((e) => e.id) })) > 0, "that seeded event still has private data");
  check(total(keepBefore) > 0, "the other seed events have private data to protect", JSON.stringify(keepBefore));

  console.log("\nOnly the service role can run it");
  const { error: anonError } = await anonClient().rpc("run_retention");
  check(!!anonError, "the public (anon) key can't run the cleanup");
  const admin = anonClient();
  await admin.auth.signInWithPassword({ email: env("SEED_ADMIN_EMAIL"), password: env("SEED_ADMIN_PASSWORD") });
  const { error: adminError } = await admin.rpc("run_retention");
  check(!!adminError, "a logged-in admin can't run it from the browser either");
  check(total(await privateRows({ only: old })) === ROWS_PER_EVENT, "nothing was removed by those attempts");

  console.log("\nCleanup");
  const startedAt = new Date().toISOString();
  const email = (daysAgo: number) => ({
    to_email: `retention-${daysAgo}@example.com`,
    template: "E10",
    subject: "Retention test",
    body: "Aoife <aoife@example.com>",
    provider: "console" as const,
    created_at: new Date(Date.now() - daysAgo * DAY).toISOString(),
  });
  const { data: emails, error: emailError } = await service.from("email_log").insert([email(31), email(29)]).select("id, to_email");
  if (emailError) throw emailError;
  const removed = await runRetention(service);
  check(total(await privateRows({ only: old })) === 0, "removes everything private for an event that ended 30 days ago");
  check(total(await privateRows({ only: justOver })) === 0, "and for one that ended 8 days ago");
  check(total(await privateRows({ only: seededDue.map((e) => e.id) })) === 0, "and for the seeded event that ended 10 days ago");
  const under = await privateRows({ only: justUnder });
  check(total(under) === ROWS_PER_EVENT, "keeps everything for an event that ended 6 days ago", JSON.stringify(under));
  const keepAfter = await privateRows({ except: dueIds });
  check(JSON.stringify(keepAfter) === JSON.stringify(keepBefore), "leaves every other event's data alone", JSON.stringify(keepAfter));
  check(
    removed.registrations === dueBefore.registrations &&
      removed.host_details === dueBefore.event_private_details &&
      removed.contact_requests === dueBefore.contact_requests &&
      removed.host_edits === dueBefore.event_edits &&
      removed.attention_items === dueBefore.attention_items,
    "reports what it removed",
    `${JSON.stringify(removed)} vs ${JSON.stringify(dueBefore)}`,
  );

  const { data: emailsLeft } = await service.from("email_log").select("to_email").in("id", emails.map((e) => e.id));
  check(emailsLeft?.length === 1 && emailsLeft[0].to_email === "retention-29@example.com", "deletes email records older than 30 days and keeps newer ones", JSON.stringify(emailsLeft));
  const { data: kept } = await service.from("events").select("id, title, host_edit_token_hash").in("id", [...dueIds, justUnder]);
  check(kept?.length === dueIds.length + 1, "keeps the event rows themselves for counting");
  check(kept?.find((e) => e.id === old)?.host_edit_token_hash === null, "clears the host link of an old event");
  check(kept?.find((e) => e.id === justUnder)?.host_edit_token_hash !== null, "keeps the host link of a recent event");
  const { count: seededLinks } = await service
    .from("events")
    .select("id", { count: "exact", head: true })
    .not("host_edit_token_hash", "is", null)
    .not("id", "in", `(${[...dueIds, justUnder].join(",")})`);
  check((seededLinks ?? 0) > 0, "seeded live events keep their host links");

  const { data: log } = await service
    .from("event_activity")
    .select("event_id, actor, action, note")
    .eq("action", "retention_cleanup")
    .gte("created_at", startedAt);
  check(log?.length === 1 && log[0].actor === "system" && log[0].event_id === null, "logs the run as system");
  check(!!log?.[0]?.note?.includes(`${dueBefore.registrations} registrations`), "the log says what was removed", log?.[0]?.note ?? "");

  console.log("\nRunning it again");
  const again = await runRetention(service);
  check(
    again.registrations + again.host_details + again.contact_requests + again.host_edits + again.attention_items + again.host_links + again.email_records === 0,
    "a second run finds nothing more to remove",
    JSON.stringify(again),
  );
  check(total(await privateRows({ only: justUnder })) === ROWS_PER_EVENT, "and still keeps the recent event's data");
  const { count: runs } = await service
    .from("event_activity")
    .select("id", { count: "exact", head: true })
    .eq("action", "retention_cleanup")
    .gte("created_at", startedAt);
  check(runs === 2, "every run is logged, even when there is nothing to remove");

  console.log("\nCron route");
  const reachable = await fetch(`${BASE_URL}/api/cron/retention`).then(
    (r) => r,
    () => null,
  );
  if (!reachable) {
    console.log(`- skipped: the app isn't running at ${BASE_URL}`);
  } else {
    check(reachable.status === 401, "refuses a request without the secret", String(reachable.status));
    const wrong = await fetch(`${BASE_URL}/api/cron/retention`, { headers: { authorization: "Bearer wrong" } });
    check(wrong.status === 401, "refuses the wrong secret", String(wrong.status));
    const ok = await fetch(`${BASE_URL}/api/cron/retention`, { headers: { authorization: `Bearer ${env("CRON_SECRET")}` } });
    const body = (await ok.json().catch(() => null)) as { ok?: boolean } | null;
    check(ok.status === 200 && body?.ok === true, "runs with the right secret", `${ok.status} ${JSON.stringify(body)}`);
  }

  // Leave the database as a fresh seed would.
  execSync("npm run seed", { stdio: "ignore" });

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
