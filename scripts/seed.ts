/**
 * npm run seed
 *
 * Resets all event and content data and fills the database with sample data so
 * every admin screen can be tested before the public and host sites exist.
 * Safe to re-run. Creates (or updates) the admin login from SEED_ADMIN_EMAIL /
 * SEED_ADMIN_PASSWORD. Never run against production data you want to keep.
 */
import { generateHostToken, hashHostToken } from "../lib/events/host-token";
import type { Database } from "../lib/supabase/database.types";
import { env, serviceClient } from "./lib/env";
import { placeholderPng } from "./lib/placeholder-png";
import { TEST_HOST_TOKENS, TEST_TOKEN_EVENTS } from "./lib/test-tokens";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type PrivateInsert = Omit<Database["public"]["Tables"]["event_private_details"]["Insert"], "event_id">;

const db = serviceClient();
const NIL = "00000000-0000-0000-0000-000000000000";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// An ISO timestamp for a wall-clock time in Ireland, `days` from today.
function dublin(days: number, time: string): string {
  const [hh, mm] = time.split(":").map(Number);
  const day = new Date(Date.now() + days * DAY);
  const guess = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hh, mm);
  const wall = new Date(new Date(guess).toLocaleString("en-US", { timeZone: "Europe/Dublin" }));
  const asUtc = new Date(new Date(guess).toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess - (wall.getTime() - asUtc.getTime())).toISOString();
}

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function fail(step: string, error: { message: string } | null): never {
  console.error(`Seed failed while ${step}: ${error?.message}`);
  process.exit(1);
}

async function seedAdmin() {
  const email = env("SEED_ADMIN_EMAIL");
  const password = env("SEED_ADMIN_PASSWORD");

  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) fail("listing users", listError);

  let userId = list.users.find((u) => u.email === email)?.id;
  if (userId) {
    const { error } = await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) fail("updating the admin user", error);
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) fail("creating the admin user", error);
    userId = data.user.id;
  }

  const { error } = await db
    .from("admins")
    .upsert({ user_id: userId, display_name: "Karina" }, { onConflict: "user_id" });
  if (error) fail("adding the admin row", error);
  console.log(`✓ Admin login: ${email}`);
}

async function clearData() {
  // Child tables cascade from events.
  for (const table of [
    "events",
    "event_activity",
    "site_sections",
    "stories",
    "podcasts",
    "gallery_images",
    "email_log",
  ] as const) {
    const { error } = await db.from(table).delete().neq("id", NIL);
    if (error) fail(`clearing ${table}`, error);
  }

  // Rate-limit counters, so browser tests can submit forms freely after a re-seed.
  const { error: rlError } = await db.from("rate_limits").delete().gte("id", 0);
  if (rlError) fail("clearing rate_limits", rlError);

  const { data: files } = await db.storage.from("gallery").list("seed");
  if (files?.length) await db.storage.from("gallery").remove(files.map((f) => `seed/${f.name}`));
  console.log("✓ Cleared existing event and content data");
}

type SeedEvent = {
  key: string;
  event: EventInsert;
  host: PrivateInsert;
  registrants?: string[];
};

function host(name: string, email: string, address: string, about: string): PrivateInsert {
  return {
    host_name: name,
    host_email: email,
    host_phone: "+353 87 000 0000",
    about_group: about,
    exact_address: address,
    emergency_contact_name: "Siobhán O'Brien",
    emergency_contact_phone: "+353 86 000 0000",
  };
}

const mary = host(
  "Mary O'Brien",
  "mary@example.com",
  "Car park, Main Street, Ennistymon",
  "Small walking group running for two years",
);

const events: SeedEvent[] = [
  // --- Pending (new requests) ---
  {
    key: "gentle-walk",
    event: {
      title: "Gentle Walk & Chat",
      county: "Co. Clare",
      start_at: dublin(14, "11:00"),
      end_at: dublin(14, "13:00"),
      description: "A relaxed walk at an easy pace, followed by tea. All welcome, no experience needed.",
      capacity: 15,
      status: "pending",
      submitted_at: ago(4 * HOUR),
      // opened_by_admin_at left null: shows the "New" badge.
    },
    host: mary,
  },
  {
    key: "sound-bath",
    event: {
      title: "Sound Bath Evening",
      county: "Co. Limerick",
      start_at: dublin(20, "19:00"),
      end_at: dublin(20, "20:30"),
      description: "Lie back and relax to the sound of singing bowls. Mats provided; bring a blanket.",
      capacity: 12,
      status: "pending",
      submitted_at: ago(1 * DAY),
      opened_by_admin_at: ago(20 * HOUR),
    },
    host: host("John Kelly", "john@example.com", "Unit 4, Riverside Studios, Limerick", "A small sound healing collective"),
  },

  // --- Needs changes / declined ---
  {
    key: "pottery",
    event: {
      title: "Pottery for Beginners",
      county: "Co. Kerry",
      start_at: dublin(25, "14:00"),
      end_at: dublin(25, "16:00"),
      description: "Try hand-building with clay in a friendly, no-pressure session.",
      capacity: 8,
      status: "needs_changes",
      status_reason: "Please add what people should bring and whether there is a cost for materials.",
      submitted_at: ago(3 * DAY),
      opened_by_admin_at: ago(2 * DAY),
    },
    host: host("Orla Byrne", "orla@example.com", "The Old Creamery, Kenmare", "Local makers' collective"),
  },
  {
    key: "declined",
    event: {
      title: "Crystal Market",
      county: "Co. Mayo",
      start_at: dublin(18, "10:00"),
      end_at: dublin(18, "15:00"),
      description: "A market selling crystals and jewellery.",
      status: "declined",
      status_reason: "This is a market rather than a community gathering, so it isn't a fit for the site. Thank you for thinking of us.",
      submitted_at: ago(5 * DAY),
      opened_by_admin_at: ago(4 * DAY),
    },
    host: host("Dee Walsh", "dee@example.com", "Parish Hall, Westport", "Small business"),
  },

  // --- Live, upcoming ---
  {
    key: "sunrise",
    event: {
      title: "Sunrise Meditation",
      county: "Co. Clare",
      start_at: dublin(3, "07:00"),
      end_at: dublin(3, "08:00"),
      description: "A quiet guided meditation as the sun comes up. Wrap up warm.",
      capacity: 30,
      status: "live",
      submitted_at: ago(9 * DAY),
      opened_by_admin_at: ago(8 * DAY),
      approved_at: ago(8 * DAY),
    },
    host: host("Áine Ní Bhriain", "aine@example.com", "Fanore beach car park, Fanore", "Meditation circle that meets monthly"),
    registrants: ["Aoife", "Niamh K.", "Sam", "R.", "Clodagh", "Jo"],
  },
  {
    key: "yoga",
    event: {
      title: "Mindful Morning Yoga",
      county: "Co. Cork",
      start_at: dublin(6, "10:00"),
      end_at: dublin(6, "11:30"),
      description: "A gentle yoga flow for all levels, followed by tea and a chat.",
      capacity: 20,
      status: "live",
      submitted_at: ago(10 * DAY),
      opened_by_admin_at: ago(9 * DAY),
      approved_at: ago(9 * DAY),
    },
    host: host("Laura Fitzgerald", "laura@example.com", "Community Hall, Main Street, Clonakilty", "Yoga teacher, runs a weekly class"),
    registrants: ["Aoife", "Sam", "R."],
  },
  {
    key: "drum",
    event: {
      title: "Community Drum Circle",
      county: "Co. Cork",
      start_at: dublin(9, "18:00"),
      end_at: dublin(9, "20:00"),
      description: "No drumming experience needed. Drums provided, or bring your own.",
      capacity: 25,
      status: "live",
      submitted_at: ago(12 * DAY),
      opened_by_admin_at: ago(11 * DAY),
      approved_at: ago(11 * DAY),
    },
    host: host("Ciara Murphy", "ciara@example.com", "Back room, The Corner House, Cork", "Drum circle running since 2023"),
    registrants: ["Niamh K.", "Sam"],
  },
  {
    key: "book-club",
    event: {
      title: "Book Club Evening",
      county: "Co. Galway",
      start_at: dublin(16, "19:00"),
      end_at: dublin(16, "21:00"),
      description: "This month we're reading short stories. Come along even if you haven't finished!",
      status: "live",
      submitted_at: ago(6 * DAY),
      opened_by_admin_at: ago(5 * DAY),
      approved_at: ago(5 * DAY),
    },
    host: host("Fiona Ryan", "fiona@example.com", "Upstairs at Kennys Café, Galway", "Monthly book club"),
    registrants: ["Aoife", "R."],
  },

  // Public site (spec section 12): a full event and one with a single place left. No posters.
  {
    key: "sea-swim",
    event: {
      title: "Sea Swim & Sauna",
      county: "Co. Sligo",
      start_at: dublin(11, "09:00"),
      end_at: dublin(11, "11:00"),
      description: "A short, safe dip at Strandhill followed by the wood-fired sauna. Swimmers of every ability welcome.",
      capacity: 4,
      status: "live",
      submitted_at: ago(7 * DAY),
      opened_by_admin_at: ago(6 * DAY),
      approved_at: ago(6 * DAY),
    },
    host: host("Orla Kenny", "orla.kenny@example.com", "Strandhill seafront, by the lifeguard hut", "Year-round sea swimming group"),
    registrants: ["Aoife", "Sam", "R.", "Jo"],
  },
  {
    key: "pottery-taster",
    event: {
      title: "Pottery Taster Evening",
      county: "Co. Clare",
      start_at: dublin(20, "19:00"),
      end_at: dublin(20, "21:00"),
      description: "Get your hands muddy and make a small bowl to take home. Materials included.",
      capacity: 6,
      status: "live",
      submitted_at: ago(5 * DAY),
      opened_by_admin_at: ago(4 * DAY),
      approved_at: ago(4 * DAY),
    },
    host: host("Méabh Doyle", "meabh@example.com", "The Old Creamery studio, Kilfenora", "Potter who runs small workshops"),
    registrants: ["Niamh K.", "Clodagh", "Sam", "Jo", "Aoife"],
  },

  // --- Live, past (ended 2 days ago): shows in "Past (last 7 days)" ---
  {
    key: "beach-clean",
    event: {
      title: "Beach Clean & Connect",
      county: "Co. Clare",
      start_at: dublin(-2, "10:00"),
      end_at: dublin(-2, "12:00"),
      description: "Help tidy the beach, then warm up with soup.",
      status: "live",
      submitted_at: ago(15 * DAY),
      opened_by_admin_at: ago(14 * DAY),
      approved_at: ago(14 * DAY),
    },
    host: host("Mary O'Brien", "mary@example.com", "Lifeguard hut, Lahinch beach", "Small walking group running for two years"),
    registrants: ["Sam", "Niamh K."],
  },

  // --- Live, ended 10 days ago: hidden from admin, its private data is due for deletion.
  //     Lets the retention job (milestone 7) be tested against seed data.
  {
    key: "old-picnic",
    event: {
      title: "Autumn Picnic",
      county: "Co. Leitrim",
      start_at: dublin(-10, "13:00"),
      end_at: dublin(-10, "16:00"),
      description: "Bring something to share.",
      status: "live",
      submitted_at: ago(25 * DAY),
      opened_by_admin_at: ago(24 * DAY),
      approved_at: ago(24 * DAY),
    },
    host: host("Grace Doyle", "grace@example.com", "Lough Rynn gardens, Mohill", "Friends of Leitrim"),
    registrants: ["Aoife", "Jo"],
  },

  // --- Cancelled (by host) / taken down ---
  {
    key: "forest-bathing",
    event: {
      title: "Forest Bathing",
      county: "Co. Galway",
      start_at: dublin(11, "11:00"),
      end_at: dublin(11, "13:00"),
      description: "A slow, mindful walk through the woods.",
      capacity: 10,
      status: "cancelled",
      submitted_at: ago(14 * DAY),
      opened_by_admin_at: ago(13 * DAY),
      approved_at: ago(13 * DAY),
    },
    host: host("Siobhán Kenny", "siobhan@example.com", "Portumna Forest Park entrance", "Nature therapy group"),
    registrants: ["Clodagh"],
  },
  {
    key: "open-mic",
    event: {
      title: "Open Mic Night",
      county: "Co. Sligo",
      start_at: dublin(8, "20:00"),
      end_at: dublin(8, "23:00"),
      description: "Songs, poems and stories. Sign up on the night.",
      status: "taken_down",
      status_reason: "The venue has told us it can no longer host the event.",
      submitted_at: ago(9 * DAY),
      opened_by_admin_at: ago(8 * DAY),
      approved_at: ago(8 * DAY),
    },
    host: host("Rachel Gallagher", "rachel@example.com", "The Snug, Sligo town", "Local musicians"),
  },
];

async function seedEvents() {
  const ids: Record<string, string> = {};

  for (const { key, event, host: details, registrants = [] } of events) {
    const row: EventInsert = { ...event };
    if (event.status === "live" || event.status === "cancelled" || event.status === "taken_down") {
      row.host_edit_token_hash = generateHostToken().hash;
    }
    if (key === TEST_TOKEN_EVENTS.live) row.host_edit_token_hash = hashHostToken(TEST_HOST_TOKENS.live);
    if (key === TEST_TOKEN_EVENTS.needsChanges) row.host_edit_token_hash = hashHostToken(TEST_HOST_TOKENS.needsChanges);

    const { data, error } = await db.from("events").insert(row).select("id").single();
    if (error) fail(`inserting event "${event.title}"`, error);
    ids[key] = data.id;

    const { error: pErr } = await db.from("event_private_details").insert({ ...details, event_id: data.id });
    if (pErr) fail(`inserting private details for "${event.title}"`, pErr);

    if (registrants.length) {
      const { error: rErr } = await db.from("registrations").insert(
        registrants.map((name, i) => ({
          event_id: data.id,
          name,
          email: `${name.toLowerCase().replace(/[^a-z]/g, "") || "guest"}${i}@example.com`,
          consented_at: ago((i + 1) * DAY),
          created_at: ago((i + 1) * DAY),
        })),
      );
      if (rErr) fail(`inserting registrations for "${event.title}"`, rErr);
    }

    const activity: Database["public"]["Tables"]["event_activity"]["Insert"][] = [
      { event_id: data.id, actor: "host", action: "Submitted", created_at: event.submitted_at },
    ];
    if (event.approved_at) {
      activity.push({ event_id: data.id, actor: "admin", action: "Approved", created_at: event.approved_at });
    }
    const adminDecision = { needs_changes: "Requested changes", declined: "Declined", taken_down: "Taken down" } as const;
    if (event.status && event.status in adminDecision) {
      activity.push({
        event_id: data.id,
        actor: "admin",
        action: adminDecision[event.status as keyof typeof adminDecision],
        note: event.status_reason,
        created_at: event.status === "taken_down" ? ago(1 * DAY) : (event.opened_by_admin_at ?? ago(1 * DAY)),
      });
    }
    const { error: aErr } = await db.from("event_activity").insert(activity);
    if (aErr) fail(`inserting activity for "${event.title}"`, aErr);
  }

  console.log(`✓ ${events.length} events in every status, with private details and registrations`);
  return ids;
}

async function seedAttention(ids: Record<string, string>) {
  // 1. Host edited a live event.
  const { data: edit, error: editErr } = await db
    .from("event_edits")
    .insert({
      event_id: ids.yoga,
      changes: {
        title: { before: "Morning Yoga", after: "Mindful Morning Yoga" },
        description: {
          before: "A gentle yoga flow for all levels.",
          after: "A gentle yoga flow for all levels, followed by tea and a chat.",
        },
        capacity: { before: 15, after: 20 },
      },
      created_at: ago(1 * DAY),
    })
    .select("id")
    .single();
  if (editErr) fail("inserting the host edit", editErr);

  // 2. Contact-detail request from a host.
  const { data: request, error: reqErr } = await db
    .from("contact_requests")
    .insert({
      event_id: ids.sunrise,
      host_reason: "I'd like to let people know the meeting point has moved to the north end of the beach.",
      created_at: ago(2 * HOUR),
    })
    .select("id")
    .single();
  if (reqErr) fail("inserting the contact request", reqErr);

  // Bulk inserts send every column for every row, so set needs_decision explicitly.
  const { error } = await db.from("attention_items").insert([
    { event_id: ids.sunrise, type: "contact_request", ref_id: request.id, needs_decision: true, created_at: ago(2 * HOUR) },
    { event_id: ids.yoga, type: "host_edited", ref_id: edit.id, needs_decision: false, created_at: ago(1 * DAY) },
    { event_id: ids["forest-bathing"], type: "host_cancelled", needs_decision: false, created_at: ago(2 * DAY) },
  ]);
  if (error) fail("inserting attention items", error);

  await db.from("event_activity").insert([
    { event_id: ids.yoga, actor: "host", action: "Edited the event", note: "Changed title, description, capacity", created_at: ago(1 * DAY) },
    { event_id: ids["forest-bathing"], actor: "host", action: "Cancelled the event", created_at: ago(2 * DAY) },
    { event_id: ids.sunrise, actor: "host", action: "Requested contact details", created_at: ago(2 * HOUR) },
  ]);

  console.log("✓ 3 attention items: host edit, host cancellation, contact request");
}

async function seedContent() {
  const sections = [
    { page: "home", key: "hero", heading: "Real people. Meaningful connections.", body: "Conscious Connections brings women and non-binary people in rural Ireland together through shared interests, wellbeing and nature.", sort_order: 1 },
    { page: "home", key: "intro", heading: "A friendly community for connection", body: "Find a local event, meet like-minded people, or host something of your own. Everyone is welcome.", sort_order: 2 },
    { page: "home", key: "host_cta", heading: "Host an event", body: "Have an idea for a walk, a workshop or a cuppa and a chat? Share it with the community.", sort_order: 3 },
    { page: "about", key: "about", heading: "About Conscious Connections", body: "Conscious Connections was started by Karina to make it easier to find your people in rural Ireland.", sort_order: 1 },
  ];
  const { error: sErr } = await db.from("site_sections").insert(sections);
  if (sErr) fail("inserting homepage sections", sErr);

  const { error: stErr } = await db.from("stories").insert([
    { title: "Finding my people in Leitrim", slug: "finding-my-people-in-leitrim", body: "When I moved to Leitrim I didn't know anyone. The first walk I went to changed that…", published: true, published_at: ago(10 * DAY) },
    { title: "A kinder, calmer me", slug: "a-kinder-calmer-me", body: "Draft: a member's story about the sunrise meditation group.", published: false },
  ]);
  if (stErr) fail("inserting stories", stErr);

  const { error: pErr } = await db.from("podcasts").insert([
    { title: "Episode 4: Starting small", description: "How a two-person walk became a community.", youtube_url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", published: true, published_at: ago(14 * DAY) },
    { title: "Episode 5: The power of nature", description: "Why so many of our events happen outdoors.", youtube_url: "https://youtu.be/aqz-KE-bpKQ", published: false },
  ]);
  if (pErr) fail("inserting podcasts", pErr);

  const colours = ["#4F7A65", "#A3B8A8", "#D9CBB3", "#8C9A7E", "#C4A484", "#6F8F9A"];
  const gallery = [];
  for (const [i, colour] of colours.entries()) {
    const path = `seed/placeholder-${i + 1}.png`;
    const { error } = await db.storage
      .from("gallery")
      .upload(path, placeholderPng(800, 600, colour), { contentType: "image/png", upsert: true });
    if (error) fail(`uploading gallery image ${path}`, error);
    gallery.push({ image_path: path, caption: `Placeholder image ${i + 1}`, sort_order: i + 1 });
  }
  const { error: gErr } = await db.from("gallery_images").insert(gallery);
  if (gErr) fail("inserting gallery images", gErr);

  console.log("✓ Content: 4 page sections, 2 stories, 2 podcasts, 6 gallery images");
}

async function main() {
  await seedAdmin();
  await clearData();
  const ids = await seedEvents();
  await seedAttention(ids);
  await seedContent();
  const site = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  console.log(`✓ Test host links (local only):`);
  console.log(`    live event:          ${site}/host/${TEST_HOST_TOKENS.live}`);
  console.log(`    needs-changes event: ${site}/host/${TEST_HOST_TOKENS.needsChanges}`);
  console.log("Seed complete.");
}

main();
