/**
 * npm run test:rls
 *
 * Checks Row Level Security against a seeded database (run `npm run seed` first):
 * - anon cannot read or write private tables, and sees only public-safe event data;
 * - a signed-in user who is not an admin is blocked the same way;
 * - the seeded admin can read everything.
 * Exits with code 1 if any check fails.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";
import { anonClient, env, serviceClient } from "./lib/env";

type Client = ReturnType<typeof anonClient>;

const PRIVATE_TABLES = [
  "event_private_details",
  "registrations",
  "contact_requests",
  "event_edits",
  "attention_items",
  "email_log",
  "event_activity",
  "admins",
] as const;

let failures = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${!ok && detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

async function signedIn(email: string, password: string): Promise<Client> {
  const client = createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);
  return client;
}

// A table is "blocked" when the read errors (no privilege) or returns no rows.
async function rowsVisible(client: Client, table: (typeof PRIVATE_TABLES)[number]) {
  const { data, error } = await client.from(table).select("id");
  return error ? 0 : (data?.length ?? 0);
}

async function checkOutsider(client: Client, who: string, service: Client) {
  for (const table of PRIVATE_TABLES) {
    const { count } = await service.from(table).select("id", { count: "exact", head: true });
    const visible = await rowsVisible(client, table);
    // "admins": a non-admin may see only their own row, which they don't have.
    check(visible === 0, `${who} cannot read ${table}`, `saw ${visible} of ${count} rows`);
  }

  const { data: live } = await service
    .from("events")
    .select("id")
    .eq("status", "live")
    .gt("end_at", new Date().toISOString());
  const { data: events, error } = await client.from("events").select("id, status, end_at");
  const now = Date.now();
  check(
    !error && !!events && events.every((e) => e.status === "live" && Date.parse(e.end_at) > now),
    `${who} sees only live, upcoming events`,
    error?.message,
  );
  check(events?.length === live?.length, `${who} sees all ${live?.length} live, upcoming events`, `saw ${events?.length}`);

  const { error: insertError } = await client.from("events").insert({
    title: "Should not be allowed",
    county: "Co. Clare",
    start_at: new Date(now + 86_400_000).toISOString(),
    end_at: new Date(now + 90_000_000).toISOString(),
    description: "RLS test",
  });
  check(!!insertError, `${who} cannot create events directly`);

  const { error: emailWrite } = await client
    .from("email_log")
    .insert({ to_email: "x@example.com", template: "test", subject: "x", body: "x", provider: "console" });
  check(!!emailWrite, `${who} cannot write to email_log`);

  const { data: stories } = await client.from("stories").select("published");
  check(!!stories?.length && stories.every((s) => s.published), `${who} sees only published stories`);
  const { data: podcasts } = await client.from("podcasts").select("published");
  check(!!podcasts?.length && podcasts.every((p) => p.published), `${who} sees only published podcasts`);

  const { error: storyWrite } = await client.from("stories").insert({ title: "x", slug: `rls-${now}` });
  check(!!storyWrite, `${who} cannot write stories`);

  const upload = await client.storage
    .from("gallery")
    .upload(`rls-test-${now}.png`, new Blob([new Uint8Array([1])], { type: "image/png" }));
  check(!!upload.error, `${who} cannot upload to storage`);
}

async function main() {
  const service = serviceClient();
  const anon = anonClient();

  const { count } = await service.from("event_private_details").select("id", { count: "exact", head: true });
  if (!count) {
    console.error("No seed data found. Run `npm run seed` first.");
    process.exit(1);
  }

  console.log("\nAnonymous visitor");
  await checkOutsider(anon, "anon", service);
  const { error: hashError } = await anon.from("events").select("host_edit_token_hash");
  check(!!hashError, "anon cannot read events.host_edit_token_hash");
  const { error: reasonError } = await anon.from("events").select("status_reason");
  check(!!reasonError, "anon cannot read events.status_reason");

  console.log("\nSigned-in user who is not an admin");
  const email = `rls-test-${Date.now()}@example.com`;
  const password = `pw-${crypto.randomUUID()}`;
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;
  try {
    const outsider = await signedIn(email, password);
    await checkOutsider(outsider, "non-admin", service);
    const { data: isAdmin } = await outsider.rpc("is_admin");
    check(isAdmin === false, "non-admin: is_admin() is false");
  } finally {
    await service.auth.admin.deleteUser(created.user.id);
  }

  console.log("\nSeeded admin");
  const admin = await signedIn(env("SEED_ADMIN_EMAIL"), env("SEED_ADMIN_PASSWORD"));
  const { data: isAdmin } = await admin.rpc("is_admin");
  check(isAdmin === true, "admin: is_admin() is true");
  for (const table of PRIVATE_TABLES) {
    const { count } = await service.from(table).select("id", { count: "exact", head: true });
    const { data, error } = await admin.from(table).select("id");
    check(!error && data?.length === count, `admin can read all ${count} rows of ${table}`, error?.message ?? `saw ${data?.length}`);
  }
  const { data: allEvents } = await admin.from("events").select("status, host_edit_token_hash");
  const statuses = new Set(allEvents?.map((e) => e.status));
  check(statuses.size === 6, "admin sees events in all 6 statuses", [...statuses].join(", "));
  const { data: drafts } = await admin.from("stories").select("id").eq("published", false);
  check(!!drafts?.length, "admin sees unpublished stories");

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll RLS checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
