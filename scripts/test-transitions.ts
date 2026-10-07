/**
 * npm run test:transitions  (milestone 4: status rules and emails)
 *
 * Needs the local database (it creates and deletes its own test events).
 * Checks every from → to status pair against the rules in spec section 4,
 * that reasons and confirmations are required, that a change made by someone
 * else in the meantime is rejected, that approving stores only the link's hash,
 * and that emails are rendered safely and written to email_log.
 */
import { hashHostToken } from "../lib/events/host-token";
import { TRANSITIONS, TransitionError, checkTransition, transitionEvent, type Actor } from "../lib/events/transitions";
import type { EventStatus } from "../lib/events/status";
import { ConsoleEmailService, ResendEmailService, sendAndLog } from "../lib/email/service";
import { approvedEmail, declinedEmail, needsChangesEmail } from "../lib/email/templates";
import { serviceClient } from "./lib/env";

const STATUSES: EventStatus[] = ["pending", "needs_changes", "declined", "live", "cancelled", "taken_down"];
const ALLOWED: [EventStatus, EventStatus, Actor[]][] = [
  ["pending", "live", ["admin"]],
  ["pending", "needs_changes", ["admin"]],
  ["pending", "declined", ["admin"]],
  ["needs_changes", "pending", ["host"]],
  ["live", "cancelled", ["admin", "host"]],
  ["live", "taken_down", ["admin"]],
];

let failures = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${!ok && detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

function rejects(fn: () => unknown, pattern?: RegExp) {
  try {
    fn();
    return false;
  } catch (e) {
    return e instanceof TransitionError && (!pattern || pattern.test(e.message));
  }
}

async function rejectsAsync(fn: () => Promise<unknown>, pattern?: RegExp) {
  try {
    await fn();
    return false;
  } catch (e) {
    return e instanceof TransitionError && (!pattern || pattern.test(e.message));
  }
}

const supabase = serviceClient();
const created: string[] = [];

async function makeEvent(status: EventStatus) {
  const start = new Date(Date.now() + 10 * 86_400_000);
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: `Transition test (${status})`,
      county: "Co. Clare",
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 7_200_000).toISOString(),
      description: "Created by npm run test:transitions",
      status,
    })
    .select("id")
    .single();
  if (error) throw error;
  created.push(data.id);
  return data.id;
}

async function main() {
  console.log("Rules: every status pair");
  const actors: Actor[] = ["admin", "host"];
  let pairs = 0;
  for (const from of STATUSES) {
    for (const to of STATUSES) {
      for (const actor of actors) {
        const allowed = ALLOWED.some(([f, t, a]) => f === from && t === to && a.includes(actor));
        const ok = !rejects(() => checkTransition(from, to, actor, { reason: "Because", confirmed: true }));
        if (ok !== allowed) check(false, `${actor}: ${from} → ${to} should be ${allowed ? "allowed" : "rejected"}`);
        pairs++;
      }
    }
  }
  const listed = Object.values(TRANSITIONS).reduce((n, t) => n + Object.keys(t ?? {}).length, 0);
  check(listed === ALLOWED.length, `only the ${ALLOWED.length} transitions in the spec exist`, `${listed} listed`);
  check(failures === 0, `all ${pairs} status pairs (both actors) match the spec`);

  check(rejects(() => checkTransition("pending", "needs_changes", "admin", { reason: "   " }), /reason/), "request changes needs a reason");
  check(rejects(() => checkTransition("pending", "declined", "admin", {}), /reason/), "decline needs a reason");
  check(rejects(() => checkTransition("live", "taken_down", "admin", { reason: "" }), /reason/), "take down needs a reason");
  check(rejects(() => checkTransition("live", "cancelled", "admin", {}), /confirm/), "cancel needs confirmation");
  check(rejects(() => checkTransition("pending", "declined", "admin", { reason: "x".repeat(1001) }), /1000/), "reasons are capped at 1000 characters");
  check(!rejects(() => checkTransition("pending", "live", "admin")), "approve needs no reason");
  check(
    rejects(() => checkTransition("declined", "live", "admin"), /declined, so it can't be approved/),
    "rejection message is plain language",
  );

  console.log("\nAgainst the database");
  const a = await makeEvent("pending");
  const approved = await transitionEvent(supabase, { eventId: a, to: "live", actor: "admin" });
  const { data: row } = await supabase.from("events").select("status, approved_at, host_edit_token_hash").eq("id", a).single();
  check(row?.status === "live" && !!row.approved_at, "approve sets status live and approved_at");
  check(
    !!approved.hostToken && row?.host_edit_token_hash === hashHostToken(approved.hostToken),
    "approve stores only the SHA-256 hash of the host link token",
  );
  check(Buffer.from(approved.hostToken ?? "", "base64url").length === 32, "host link token is 32 random bytes");
  check(await rejectsAsync(() => transitionEvent(supabase, { eventId: a, to: "declined", actor: "admin", reason: "No" }), /live/), "a live event can't then be declined");

  const b = await makeEvent("pending");
  check(
    await rejectsAsync(() => transitionEvent(supabase, { eventId: b, to: "declined", actor: "admin", reason: " " })),
    "decline without a reason is rejected",
  );
  const { data: still } = await supabase.from("events").select("status").eq("id", b).single();
  check(still?.status === "pending", "a rejected change leaves the event untouched");
  await transitionEvent(supabase, { eventId: b, to: "declined", actor: "admin", reason: "  Too similar to another event  " });
  const { data: declined } = await supabase.from("events").select("status, status_reason").eq("id", b).single();
  check(declined?.status === "declined" && declined.status_reason === "Too similar to another event", "decline saves the trimmed reason");
  const { data: activity } = await supabase.from("event_activity").select("actor, action, note").eq("event_id", b);
  check(activity?.some((x) => x.actor === "admin" && x.action === "Declined" && x.note === "Too similar to another event") ?? false, "decline is logged in the activity log");

  const c = await makeEvent("pending");
  const changes = await transitionEvent(supabase, { eventId: c, to: "needs_changes", actor: "admin", reason: "Add what to bring" });
  check(!!changes.hostToken, "request changes creates a host link so the host can edit");
  await supabase.from("events").update({ opened_by_admin_at: new Date().toISOString() }).eq("id", c);
  await transitionEvent(supabase, { eventId: c, to: "pending", actor: "host" });
  const { data: resubmitted } = await supabase.from("events").select("status, status_reason, opened_by_admin_at").eq("id", c).single();
  check(
    resubmitted?.status === "pending" && !resubmitted.status_reason && !resubmitted.opened_by_admin_at,
    "a host resubmission clears the reason and shows as New again",
  );

  // Someone else declines the event between our read and our write: the read
  // still sees "pending", but the write must not go through.
  const d = await makeEvent("pending");
  await supabase.from("events").update({ status: "declined", status_reason: "other tab" }).eq("id", d);
  let firstRead = true;
  const stale = Object.create(supabase) as typeof supabase;
  stale.from = ((table: "events") => {
    if (!firstRead || table !== "events") return supabase.from(table);
    firstRead = false;
    const fake = { select: () => fake, eq: () => fake, maybeSingle: async () => ({ data: { status: "pending" }, error: null }) };
    return fake;
  }) as unknown as typeof supabase.from;
  check(
    await rejectsAsync(() => transitionEvent(stale, { eventId: d, to: "live", actor: "admin" }), /Someone changed this event/),
    "a change made elsewhere in the meantime is rejected, not overwritten",
  );
  const { data: raced } = await supabase.from("events").select("status").eq("id", d).single();
  check(raced?.status === "declined", "the other change is kept");

  console.log("\nEmails");
  const event = { title: `Tea & <b>Talk</b>`, county: "Co. Clare", start_at: "2026-06-14T10:00:00Z", end_at: "2026-06-14T12:00:00Z" };
  const e4 = approvedEmail({ hostName: "Mary O'Brien", event, eventUrl: "https://cc.ie/events/1", hostUrl: "https://cc.ie/host/abc" });
  check(e4.template === "E4" && e4.subject === "Your event is now live!", "E4 subject");
  check(e4.text.includes("Hi Mary,") && e4.text.includes("https://cc.ie/host/abc") && e4.text.includes("Keep this email safe"), "E4 has the private link and the keep-safe note");
  check(e4.text.includes("Sun 14 Jun 2026, 11:00–13:00"), "E4 shows the date in Irish time", e4.text);
  check(e4.html.includes("Tea &amp; &lt;b&gt;Talk&lt;/b&gt;") && !e4.html.includes("<b>Talk"), "HTML escapes event text");
  const e2 = needsChangesEmail({ hostName: "Mary", event, reason: "Say what to bring", editUrl: "https://cc.ie/host/xyz" });
  check(e2.template === "E2" && e2.text.includes('"Say what to bring"') && e2.text.includes("https://cc.ie/host/xyz"), "E2 has the reason and the edit link");
  const e3 = declinedEmail({ hostName: "Mary", event, reason: "<script>alert(1)</script>" });
  check(e3.template === "E3" && !e3.html.includes("<script>") && e3.text.includes("<script>"), "E3 has the reason, escaped in HTML");

  const to = `transition-test-${Date.now()}@example.com`;
  const logged = await sendAndLog(supabase, new ConsoleEmailService(), to, e3);
  const { data: log } = await supabase.from("email_log").select("*").eq("to_email", to).single();
  check(logged.ok && log?.template === "E3" && log.provider === "console" && !!log.sent_at && !log.error, "console provider logs to email_log as sent");

  let request: { url: string; init: RequestInit } | null = null;
  const resend = new ResendEmailService("re_test", { from: "CC <no-reply@cc.ie>", replyTo: "karina@cc.ie" }, (async (url: string, init: RequestInit) => {
    request = { url, init };
    return new Response("{}", { status: 200 });
  }) as typeof fetch);
  await resend.send("host@example.com", e4);
  const sentBody = JSON.parse(String(request!.init.body));
  check(
    request!.url === "https://api.resend.com/emails" &&
      (request!.init.headers as Record<string, string>).Authorization === "Bearer re_test" &&
      sentBody.to[0] === "host@example.com" &&
      sentBody.reply_to === "karina@cc.ie" &&
      !!sentBody.html &&
      !!sentBody.text,
    "Resend provider posts the email with the API key",
  );
  const failing = new ResendEmailService("re_test", { from: "CC <x@cc.ie>" }, (async () => new Response("bad key", { status: 401 })) as typeof fetch);
  const failTo = `transition-test-fail-${Date.now()}@example.com`;
  const failed = await sendAndLog(supabase, failing, failTo, e4);
  const { data: failLog } = await supabase.from("email_log").select("*").eq("to_email", failTo).single();
  check(!failed.ok && failLog?.provider === "resend" && !failLog.sent_at && /401/.test(failLog.error ?? ""), "a failed send is logged with its error, not thrown");

  await supabase.from("email_log").delete().in("to_email", [to, failTo]);
}

main()
  .catch((error) => {
    console.error(error);
    failures++;
  })
  .finally(async () => {
    if (created.length) await supabase.from("events").delete().in("id", created);
    console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
    process.exit(failures ? 1 : 0);
  });
