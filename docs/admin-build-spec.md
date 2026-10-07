# Conscious Connections – Admin Website Build Spec (Phase 1)

> **For Claude Code.** This document specifies the admin side of the Conscious Connections website. Read it fully, then propose a plan before writing code. Work milestone by milestone (section 12) and check each milestone's acceptance criteria before moving on.

## 0. Reference files

- `docs/lofi/` – low-fidelity wireframes. **Follow them for page structure and layout.** Screen IDs (A0–A8) match this document.
- `docs/conscious-connections-prd-lofi.md` – the product PRD (all screens, decisions, statuses).
- If the wireframes and this spec disagree on **behaviour or data**, this spec wins. If they disagree on **layout**, the wireframes win. List any conflicts you find instead of silently choosing.

## 1. Context

Conscious Connections is a community for women and non-binary people in rural Ireland, run by Karina. The website lets anyone submit community events, which Karina approves, and lets visitors register discreetly to receive the exact address by email.

**This phase builds only the admin website**, used by Karina (non-technical) to:
1. Review, approve, request changes on, decline, cancel and take down events.
2. Handle "attention" items (host edits, host cancellations, contact-detail requests).
3. Edit website content: homepage sections, stories, podcasts, gallery.

The public site and host pages come later and will share the same database, so **design the schema for the whole product now**.

**Primary design goal:** a non-technical person can use every screen without help. Prefer clarity over cleverness: plain labels, confirmation messages after every action, no jargon ("status", not "state"; "Take down", not "Unpublish").

## 2. Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** with design tokens (section 3)
- **Supabase**: Postgres, Auth, Storage
- **Hosting:** Vercel
- **Email:** an `EmailService` interface. Default implementation logs to the console and writes to an `email_log` table. Add a Resend implementation that activates only when `RESEND_API_KEY` is set.
- Use server actions or route handlers for all writes. The Supabase **service role key is server-only** and never reaches the browser.
- Keep dependencies minimal. Use a small component library (e.g. shadcn/ui) only if it speeds things up.

## 3. Temporary theme

The visual design will be replaced later, so:
- Define **all colours, radii and fonts as tokens in one place** (CSS variables in `globals.css`, mapped in `tailwind.config`). No hard-coded colours in components.
- Temporary palette: calm and neutral.
  - Primary: sage green `#4F7A65`, primary hover `#3E6251`
  - Background `#FAF8F5`, surface `#FFFFFF`, border `#E5E1DA`
  - Text `#1F1F1F`, muted text `#6B6B6B`
  - Success `#2F7D4F`, warning `#B7791F`, danger `#B42318`
  - Private-data tint `#FFF7EC` (used behind host private details)
- Font: system font stack or Inter.
- Minimum body text 16px. Minimum tap target 44px. Colour contrast to WCAG AA.

## 4. Event statuses

`pending`, `needs_changes`, `declined`, `live`, `cancelled`, `taken_down`.

**Expired is derived, not stored:** an event is expired when `status = 'live'` and `end_at < now()`. Expired events show in admin "Past" for 7 days after `end_at`, then are hidden.

Allowed transitions (enforce in one server-side function, reject anything else):

| From | To | Who | Requires |
|---|---|---|---|
| pending | live | admin | – |
| pending | needs_changes | admin | reason |
| pending | declined | admin | reason |
| needs_changes | pending | host (later) | – |
| live | cancelled | admin or host | confirmation |
| live | taken_down | admin | reason |

## 5. Data model

Use Postgres enums where sensible. All tables have `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz`.

**events** (public-safe fields only)
- `title text` (max 120), `county text`, `start_at timestamptz`, `end_at timestamptz`, `description text` (max 500), `poster_path text null`, `capacity int null`
- `status event_status default 'pending'`
- `status_reason text null` (last reason given for needs_changes / declined / taken_down)
- `submitted_at timestamptz`, `approved_at timestamptz null`, `opened_by_admin_at timestamptz null` (drives the "New" badge)
- `host_edit_token_hash text null` (SHA-256 of the private link token; the raw token is never stored)

**event_private_details** (1:1 with events; never readable by the public)
- `event_id uuid fk unique`, `exact_address text`, `host_name text`, `host_email text`, `host_phone text`, `about_group text`, `emergency_contact_name text`, `emergency_contact_phone text`

**registrations**
- `event_id uuid fk`, `name text`, `email text`, `consented_at timestamptz`

**event_edits** (host edits to live events, for the before → after view)
- `event_id`, `changes jsonb` (shape: `{ field: { before, after } }`), `seen_at timestamptz null`

**attention_items**
- `event_id`, `type` (`host_edited` | `host_cancelled` | `contact_request`), `ref_id uuid null` (points to event_edits or contact_requests), `needs_decision boolean`, `seen_at timestamptz null`, `resolved_at timestamptz null`

**contact_requests**
- `event_id`, `host_reason text`, `status` (`requested` | `shared` | `declined`), `admin_reason text null`, `decided_at timestamptz null`

**event_activity** (simple audit log shown on A6)
- `event_id`, `actor` (`admin` | `host` | `system`), `action text`, `note text null`

**Content tables**
- `site_sections`: `page` (e.g. `home`, `about`), `key`, `heading`, `body`, `image_path null`, `sort_order`
- `stories`: `title`, `slug`, `cover_path null`, `body`, `published boolean`, `published_at`
- `podcasts`: `title`, `description`, `youtube_url`, `published boolean`, `published_at`
- `gallery_images`: `image_path`, `caption null`, `sort_order`

**admins**
- `user_id uuid fk auth.users unique`, `display_name`

**email_log**
- `to_email`, `template`, `subject`, `body`, `sent_at`, `provider` (`console` | `resend`), `error null`

### Storage buckets
- `posters` (public read), `gallery` (public read), `content` (public read). Uploads: JPG/PNG/WebP, max 5MB, admin-only write.

### Row Level Security
- Enable RLS on **every** table.
- Admin access: a helper `is_admin()` checks the `admins` table for `auth.uid()`.
- `event_private_details`, `registrations`, `contact_requests`, `event_edits`, `attention_items`, `email_log`, `event_activity`: **admin only**.
- `events`: admin full access. Anon may read **only** rows where `status = 'live'` and `end_at > now()` (for the future public site).
- Content tables: admin write; anon read only published rows.
- Write SQL migrations in `supabase/migrations/`.

## 6. Data retention (GDPR)

A scheduled job runs daily (Supabase `pg_cron`, or a Vercel Cron route protected by a secret):
- For events where `end_at < now() - interval '7 days'`, **delete** their `registrations`, `event_private_details`, `contact_requests` and `event_edits`, and set `host_edit_token_hash` to null.
- Keep the `events` row (public-safe fields only) for counting, but hide it from all admin lists.
- Log each run in `event_activity` as `system`.

## 7. Authentication

- Supabase Auth, email + password. **No public sign-up.** Admins are created manually (document how in the README).
- All `/admin` routes are protected by middleware. Logged-out users go to A0. Logged-in non-admins see "You don't have access".
- Sessions persist so Karina doesn't log in every visit.

## 8. Screens

General rules for all screens:
- After every action, show a confirmation toast in plain language ("Event approved. Mary has been emailed.").
- Every destructive or irreversible action has a confirmation dialog.
- Every list has an empty state.
- Loading states use skeletons, not blank screens.
- A2 and A3 must work well on mobile (≥ 360px). Other screens must be usable on mobile but are designed for desktop.

**A0 – Login**
Email, password, "Forgot password" (Supabase reset flow). Clear error messages.

**A1 – Admin home**
Two large cards:
- **Events**, showing "X new requests · Y need attention".
- **Website content**.
Simple top bar with the logo text and "Log out".

**A2 – Events overview**
- Top-right counts: live (upcoming) events, new requests, attention items.
- **Attention** – vertical list, never a carousel. Each row: label tag (**Needs your decision** for contact requests; **Update** for host edits and cancellations), event title, short summary, time. Updates have a **Mark as seen** button. Empty state: "You're all caught up."
- **New requests** – cards: poster thumbnail (or placeholder), title, county, date, host name, "submitted 2 days ago", **New** badge if `opened_by_admin_at` is null. Opening sets `opened_by_admin_at`.
- **Upcoming (live)** – soonest first, with registered count.
- **Past (last 7 days)** – muted styling, note "Removed automatically after 7 days".
- A filter or collapsed "Other" section for: needs changes (waiting on host), declined, cancelled, taken down.

**A3 – Request detail** (status `pending`)
- Public details: poster, title, county, date, start–end time, description, capacity.
- Private details panel on the private tint, labelled "Only visible to you": host name, email, phone, about the group, exact address, emergency contact, submitted time.
- Actions: **Approve** (primary), **Request changes**, **Decline**.

**A4 – Reason dialog** (Request changes, Decline, Take down)
- Required text box. Helper text: "This will be emailed to [host name]."
- Buttons: "Cancel" and the action name ("Send and decline").

**A5 – Approved confirmation**
On approve: generate a random 32-byte token, store its hash, set `status = live`, `approved_at`, log activity, send E4 with the private link (`{SITE_URL}/host/{token}`).
Show: "Approved. [Host name] has been emailed their private link." Buttons: **View live event** (link to the future public URL, may 404 for now) and **Copy host link**.
Because only the hash is stored, **Copy host link** works only on this screen immediately after approval. Later, the admin can use **Regenerate host link** on A6, which creates a new token, invalidates the old one and re-sends E4.

**A6 – Event detail (live, past, or other statuses)**
- All details read-only, registered count, list of registrant names.
- Live: **Take down** (reason dialog), **Cancel event** (confirmation: "The N registered people will be emailed. This can't be undone."), **Regenerate host link**.
- Activity log from `event_activity`.

**A7 – Attention item detail**
- **Host edited:** table of changed fields with before → after. Buttons: **Mark as seen**, **Take down**.
- **Host cancelled:** event summary + **Mark as seen**.
- **Contact request:** host's reason, registrant count. Buttons: **Share contact details** (sends E10 to the host with registrant names and emails) and **Decline** (reason dialog, sends E10 with reason).

**A8 – Website content**
Tabs or a top selector: **Homepage**, **Stories**, **Podcasts**, **Gallery**.
- **Homepage:** list of sections. Each opens an editor with heading, body text and image. **Save** shows "Saved. Your changes are live." Include a **Preview** of the section.
- **Stories:** list + "Add new story". Editor: title, cover image, body (plain textarea with basic formatting is enough), Publish/Unpublish, Delete (with confirmation).
- **Podcasts:** list + "Add new podcast". Fields: title, description, YouTube link. Validate the link and show an embedded preview once pasted.
- **Gallery:** grid, "Upload images" (multiple), caption, delete (confirmation), reorder (drag, or up/down buttons as a fallback).
- Warn before leaving a page with unsaved changes.

## 9. Emails sent from admin actions

Write templates as plain, warm, short text with a simple HTML version. Sender name "Conscious Connections".

| ID | Trigger | To | Content |
|---|---|---|---|
| E2 | Request changes | Host | Karina's reason, what to do next |
| E3 | Decline | Host | Kind thanks + Karina's reason |
| E4 | Approve / regenerate link | Host | Event is live, public link, **private edit link**, "keep this email safe" |
| E9 | Cancel (admin) | Each registrant | Event cancelled, apology |
| E10 | Contact request decision | Host | Contact details shared, or decline reason |

For "Take down", email the host with the reason (template E11).

## 10. Seed data

Write a seed script (`npm run seed`) so every screen can be tested before the public and host sites exist:
- 1 admin user (credentials from env vars).
- Events in every status, including: 2 pending (one unopened), 1 needs_changes, 1 declined, 4 live upcoming, 1 live past (ended 2 days ago), 1 cancelled, 1 taken_down.
- Sample event: "Gentle Walk & Chat", Co. Clare, 11:00–13:00, capacity 15, host Mary O'Brien, exact address "Car park, Main Street, Ennistymon".
- Registrations on live events (names like "Aoife", "Niamh K.", "Sam", "R.").
- 1 host edit with before/after, 1 host cancellation, 1 contact request.
- Homepage sections, 2 stories, 2 podcasts, 6 gallery images (placeholders).

## 11. Project setup

- `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `RESEND_API_KEY` (optional), `EMAIL_FROM`, `CRON_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- Suggested structure: `app/admin/...` routes, `lib/supabase/` (server and browser clients), `lib/events/` (status transitions and business rules), `lib/email/` (service + templates), `components/`.
- **README** covering: local setup, running migrations, seeding, creating an admin, deploying to Vercel, and where the theme tokens live.

## 12. Milestones

Complete in order. After each, run the app, check the acceptance criteria, and summarise what was done and anything unresolved.

1. **Foundation:** Next.js app, Tailwind tokens, Supabase clients, migrations (all tables, enums, RLS), seed script, README skeleton.
   *Done when:* migrations apply cleanly, seed runs, RLS blocks anon from private tables (write a quick test).
2. **Auth:** A0, middleware, admin check, log out.
   *Done when:* `/admin` redirects when logged out; seeded admin can log in; non-admin is blocked.
3. **Events overview:** A1, A2 with real counts and all sections, empty states, mobile layout.
   *Done when:* every seeded status appears in the right place; the New badge clears on open.
4. **Review flow:** A3, A4, A5, status transition function, E2/E3/E4 via EmailService.
   *Done when:* approve/request changes/decline all work, reasons are required, emails appear in `email_log`, invalid transitions are rejected server-side.
5. **Live events and attention:** A6, A7, take down, cancel, regenerate link, mark as seen, contact request decisions, E9/E10/E11.
   *Done when:* every attention type can be cleared; counts update immediately.
6. **Website content:** A8 with image uploads to Storage.
   *Done when:* Karina can add, edit, publish, delete and reorder each content type without errors.
7. **Retention job and polish:** daily cleanup job, accessibility pass, loading and error states, README complete.
   *Done when:* running the cleanup against seed data removes only data older than 7 days after `end_at`.

## 13. Out of scope for this phase

- Public site pages and host pages (submit form, private edit page). Build only the shared schema and the host link generation.
- Visitor or host accounts.
- Reminder or change-notification emails.
- Recurring events, payments, community chat.
- Final visual design.

## 14. Open questions

Flag rather than decide:
- Whether a second team member gets an admin login (the schema already supports multiple admins).
- Exact review time promised to hosts (currently "24–48 hours").
