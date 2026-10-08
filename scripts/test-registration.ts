/**
 * npm run test:registration  (public site milestone 3, spec sections 6, 7 and 12)
 *
 * Database-level checks of register_for_event and hit_rate_limit: capacity is
 * never exceeded when many people register at the same moment, the same email
 * can't register twice, only live upcoming events take registrations, and the
 * public can't call either function. Re-seeds before and after.
 */
import { execSync } from "node:child_process";
import { anonClient, serviceClient } from "./lib/env";

const service = serviceClient();
let failures = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${!ok && detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

async function eventId(title: string) {
  const { data } = await service.from("events").select("id").eq("title", title).single();
  if (!data) throw new Error(`Seed data is missing "${title}".`);
  return data.id;
}

async function registrations(id: string) {
  const { count } = await service.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", id);
  return count ?? 0;
}

async function main() {
  execSync("npm run seed", { stdio: "ignore" });

  console.log("Capacity under concurrent registration");
  const pottery = await eventId("Pottery Taster Evening"); // capacity 6, 5 registered
  const results = await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      service.rpc("register_for_event", { p_event_id: pottery, p_name: `Racer ${i}`, p_email: `racer${i}@example.com` }),
    ),
  );
  const outcomes = results.map((r) => r.data ?? r.error?.message);
  check(outcomes.filter((o) => o === "registered").length === 1, "exactly 1 of 25 simultaneous registrations gets the last place", outcomes.join(","));
  check(outcomes.filter((o) => o === "full").length === 24, "the other 24 are told it's full");
  check((await registrations(pottery)) === 6, "the event has exactly its capacity of 6");

  // A bigger race on a fresh event with room for 10.
  const { data: big } = await service
    .from("events")
    .insert({
      title: "Race test",
      county: "Co. Clare",
      start_at: new Date(Date.now() + 86_400_000).toISOString(),
      end_at: new Date(Date.now() + 90_000_000).toISOString(),
      description: "Test",
      capacity: 10,
      status: "live",
    })
    .select("id")
    .single();
  await service.from("event_private_details").insert({
    event_id: big!.id,
    exact_address: "1 Test Road",
    host_name: "Test Host",
    host_email: "host@example.com",
    host_phone: "087 000 0000",
    about_group: "Test",
    emergency_contact_name: "Test",
    emergency_contact_phone: "087 000 0001",
  });
  const many = await Promise.all(
    Array.from({ length: 40 }, (_, i) =>
      service.rpc("register_for_event", { p_event_id: big!.id, p_name: `P${i}`, p_email: `p${i}@example.com` }),
    ),
  );
  check(many.filter((r) => r.data === "registered").length === 10, "40 people racing for 10 places: exactly 10 get in");
  check((await registrations(big!.id)) === 10, "the database holds exactly 10 registrations");

  console.log("\nDuplicates");
  const sunrise = await eventId("Sunrise Meditation");
  const before = await registrations(sunrise);
  const first = await service.rpc("register_for_event", { p_event_id: sunrise, p_name: "Dee", p_email: "dee@example.com" });
  const again = await service.rpc("register_for_event", { p_event_id: sunrise, p_name: "Dee", p_email: "DEE@Example.com" });
  check(first.data === "registered" && again.data === "already_registered", "the same email (any capitals) is recognised", `${first.data}, ${again.data}`);
  check((await registrations(sunrise)) === before + 1, "a repeat registration doesn't add a row");
  const direct = await service.from("registrations").insert({ event_id: sunrise, name: "Dee", email: "Dee@example.com", consented_at: new Date().toISOString() });
  check(!!direct.error, "the database itself refuses a duplicate email for the same event");

  console.log("\nOnly live upcoming events");
  for (const status of ["pending", "needs_changes", "declined", "cancelled", "taken_down"] as const) {
    const { data: e } = await service.from("events").select("id").eq("status", status).limit(1).single();
    const r = await service.rpc("register_for_event", { p_event_id: e!.id, p_name: "X", p_email: `x-${status}@example.com` });
    check(r.data === "not_available", `a ${status} event takes no registrations`, String(r.data));
  }
  const ended = await eventId("Beach Clean & Connect");
  check((await service.rpc("register_for_event", { p_event_id: ended, p_name: "X", p_email: "x@example.com" })).data === "not_available", "an ended event takes no registrations");
  check((await service.rpc("register_for_event", { p_event_id: "00000000-0000-0000-0000-000000000000", p_name: "X", p_email: "x@example.com" })).data === "not_available", "an unknown event takes no registrations");

  console.log("\nOnly the server can call these");
  const anon = anonClient();
  check(!!(await anon.rpc("register_for_event", { p_event_id: sunrise, p_name: "X", p_email: "anon@example.com" })).error, "the public can't call register_for_event directly");
  check(!!(await anon.rpc("hit_rate_limit", { p_key: "x", p_limit: 1, p_window: "1 hour" })).error, "the public can't call hit_rate_limit");
  check(!!(await anon.from("rate_limits").select("id")).error, "the public can't read rate_limits");

  console.log("\nRate limit");
  const key = `test:${Date.now()}`;
  const hits = [];
  for (let i = 0; i < 4; i++) hits.push((await service.rpc("hit_rate_limit", { p_key: key, p_limit: 3, p_window: "1 hour" })).data);
  check(hits.join() === "true,true,true,false", "the 4th attempt in an hour is refused when the limit is 3", hits.join());

  execSync("npm run seed", { stdio: "ignore" });
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
