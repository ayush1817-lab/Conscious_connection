# Conscious Connections

The website for Conscious Connections, a community for women and non-binary people in rural Ireland.

This phase builds the **admin website** Karina uses to review events and edit site content. The database schema already covers the whole product (public site and host pages come later).

- Spec: [`docs/admin-build-spec.md`](docs/admin-build-spec.md)
- PRD: [`docs/conscious-connections-prd-lofi.md`](docs/conscious-connections-prd-lofi.md)
- Wireframes: [`docs/lofi/`](docs/lofi/)
- Build plan, spec/wireframe conflicts and open questions: [`docs/PLAN.md`](docs/PLAN.md)
- `prototype/` holds the earlier Vite mockup of the public site, kept for reference. It is not part of the app.

**Stack:** Next.js (App Router, TypeScript), Tailwind CSS v4, Supabase (Postgres, Auth, Storage), Vercel.

## Local setup

You need Node.js 20+ and Docker (for the local Supabase stack).

```bash
npm install
npm run db:start            # starts local Supabase and applies migrations; prints the keys
cp .env.example .env.local  # then paste the API URL, anon key and service_role key it printed
npm run seed                # sample data + the admin login from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run dev                 # http://localhost:3000/admin
```

| Script | What it does |
|---|---|
| `npm run db:start` | Start local Supabase (Docker) |
| `npm run db:reset` | Wipe the local database and re-apply every migration |
| `npm run db:push` | Apply migrations to the linked hosted project |
| `npm run db:types` | Regenerate `lib/supabase/database.types.ts` after a schema change |
| `npm run seed` | Reset event and content data and load sample data (safe to re-run) |
| `npm run retention` | Run the daily data-retention cleanup once, against the database in `.env.local` |
| `npm run test:rls` | Check Row Level Security against seeded data |
| `npm run test:auth` | Browser test of login, log out, non-admin block and forgot password (app must be running) |
| `npm run test:overview` | Browser test of the admin home and events overview (re-seeds first; app must be running) |
| `npm run test:review` | Browser test of approve, request changes and decline, and their emails (re-seeds first; app must be running) |
| `npm run test:live` | Browser test of live events (take down, cancel, new host link) and every attention item type (re-seeds first; app must be running) |
| `npm run test:content` | Browser test of website content: homepage, about, stories, podcasts and gallery, including image uploads (re-seeds first; app must be running) |
| `npm run test:a11y` | Accessibility scan (axe, WCAG 2.1 AA) of every admin screen on desktop and at 360px, plus keyboard checks (re-seeds first; app must be running) |
| `npm run test:retention` | Checks the retention cleanup removes only private data of events that ended more than 7 days ago (re-seeds first; also checks the cron route if the app is running) |
| `npm run test:transitions` | Checks every event status change against the rules, and the email templates and providers |
| `npm run lint` | TypeScript type check |

## Database and migrations

Migrations live in [`supabase/migrations/`](supabase/migrations/). The first one creates every table, enum, RLS policy, the `is_admin()` helper and the storage buckets (`posters`, `gallery`, `content`).

- **Local:** `npm run db:reset` re-applies all migrations from scratch.
- **Hosted:** `npx supabase link --project-ref <your-project-ref>` once, then `npm run db:push`.

Row Level Security is on for every table. Private tables (host details, registrations, contact requests, edits, attention items, email log, activity) are readable only by admins. The public can read only live, upcoming events (public-safe columns only) and published content. `npm run test:rls` proves this.

## Seeding

`npm run seed` deletes all events and content, then loads sample events in every status, registrations, a host edit, a host cancellation, a contact request, homepage sections, stories, podcasts and six placeholder gallery images. It also creates or updates the admin login from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. **Never run it against a database whose data you want to keep.**

## Login and access

- Everything under `/admin` is guarded by `proxy.ts` (Next.js 16's name for middleware): logged-out visitors go to the login page (A0), signed-in users who aren't in `public.admins` see "You don't have access". Each admin page and server action also checks with `requireAdmin()` (`lib/auth/admin.ts`).
- Sessions are kept in Supabase auth cookies, so Karina stays logged in between visits until she logs out.
- **Forgot password** uses Supabase's reset email. The link lands on `/auth/confirm`, which signs her in and opens `/admin/reset-password`.
- Browser tests (`npm run test:*` under `scripts/e2e/`) use Playwright's Chromium. Set `CHROMIUM_PATH` if it isn't installed in the default location.

**Hosted Supabase settings** (Authentication in the dashboard):
- **Sign In / Providers:** turn off **Allow new users to sign up**. (Local dev already has `enable_signup = false` in `supabase/config.toml`.)
- **URL Configuration:** set **Site URL** to the site address and add `https://<your-domain>/auth/confirm` to **Redirect URLs**.

## Reviewing events and emails

- **Status changes** all go through one function, `transitionEvent()` in [`lib/events/transitions.ts`](lib/events/transitions.ts). It holds the allowed moves from the spec (for example pending → live, pending → declined), requires a reason where the spec does, and refuses a change if someone else changed the event first. `npm run test:transitions` checks every combination.
- **Approve** creates the host's private link (`{SITE_URL}/host/{token}`). Only a SHA-256 hash of the token is stored, so the link is shown to Karina once, on the "Approved." screen, and emailed to the host. **Request changes** also emails a fresh private link, so the host can fix the event.
- **Emails** go through the `EmailService` in [`lib/email/`](lib/email/). Every email is recorded in the `email_log` table, including failures. Without `RESEND_API_KEY` emails are only printed to the server console. With it they are sent through [Resend](https://resend.com) (verify your sending domain there first). Templates live in `lib/email/templates.ts`.
- If an email fails, the action still happens and Karina is told to contact the host herself.
- **Live events** (event page): **Take down** needs a reason and emails the host (E11). **Cancel event** asks for confirmation and emails every registrant (E9). **Regenerate host link** emails the host a new private link (E4) and the old one stops working. Taking down or cancelling also clears that event's open attention items.
- **Attention items** each have their own page (`/admin/attention/[id]`). Host edits show what changed (before and after) with **Mark as seen** and **Take down**. Host cancellations have **Mark as seen**. Contact requests need a decision: **Share contact details** emails the host every registrant's name and email (E10), and **Decline** emails the host the reason (E10).

## Website content

Under **Website content** (`/admin/content`) Karina edits what the public website shows. Everything goes live as soon as she saves.

- **Homepage** and **About**: each section (top banner, introduction, invitation to host, about) has a heading, text with **bold** and *italic*, an optional image and a live preview.
- **Stories** and **Podcasts** are saved as drafts first, then published or unpublished from their edit page. Podcasts take a YouTube link (watch, share, Shorts or embed links all work) and show the video as a preview.
- **Gallery**: upload several images at once, add captions, move images earlier or later, and delete them.
- **Images** are JPG, PNG or WebP up to 5MB. They upload straight from the browser to Supabase Storage (`content` and `gallery` buckets), so large files never pass through the server. Replaced or deleted images are removed from Storage.
- Leaving a page with unsaved changes asks for confirmation first.

## Data retention

Spec section 6 (GDPR). Every day at 03:00 UTC, Vercel Cron calls `/api/cron/retention` (scheduled in [`vercel.json`](vercel.json)). For every event that ended more than 7 days ago it deletes the registrations, host details, contact requests, host edits and attention items, and clears the host link. The event row itself (public-safe fields only) is kept for counting; admin pages already hide events 7 days after they end. Each run is logged in `event_activity` as `system`, with a note of what was removed.

- The work is done by one database function, `public.run_retention()` ([`supabase/migrations/20261008000000_retention.sql`](supabase/migrations/20261008000000_retention.sql)), so it either all happens or none of it does. Only the service role can call it.
- The route only runs when the request carries `Authorization: Bearer <CRON_SECRET>`, which Vercel adds automatically once `CRON_SECRET` is set. Without the variable it refuses to run.
- To check it on Vercel: **Project > Settings > Cron Jobs** lists the job and has a **Run** button; its logs show what was removed. Locally, `npm run retention` runs it once.
- The same run deletes copies of sent emails (`email_log`) 30 days after sending. They hold the same personal data (E10 lists registrants' emails) but aren't linked to an event. The spec doesn't cover this; see [`docs/PLAN.md`](docs/PLAN.md).

## Accessibility

- Every admin screen passes an automated WCAG 2.1 AA scan (`npm run test:a11y`), on desktop and at 360px wide.
- Keyboard: a "Skip to main content" link comes first, every control shows a clear focus outline, and dialogs take focus when they open, close with Escape and hand focus back.
- Forms have visible labels, errors are announced, and confirmation toasts are read out by screen readers.
- Tap targets are at least 44px (`min-h-tap`), text is at least 16px, and colours meet contrast ratios (form outlines use `--color-control-border` for 3:1).
- Loading skeletons are announced as "Loading…", and animation is switched off when the device asks for reduced motion.

## Creating an admin

There is no public sign-up. To add an admin:

1. In the Supabase dashboard, go to **Authentication > Users > Add user**, enter their email and a password, and tick **Auto confirm user**.
2. Copy the new user's ID, then in the **SQL editor** run:

   ```sql
   insert into public.admins (user_id, display_name)
   values ('<user id>', 'Karina');
   ```

To remove admin access, delete that row from `public.admins` (and optionally the user).

## Theme tokens

All colours, radii and fonts are defined once, in [`app/globals.css`](app/globals.css): CSS variables in `:root`, exposed to Tailwind through the `@theme inline` block (Tailwind v4 has no `tailwind.config` file). Components use the token names (`bg-primary`, `text-muted`, `bg-private`, `rounded-card`, `min-h-tap`), never raw colours, so restyling means editing that one file.

## Deploying to Vercel

1. **Create a Supabase project** at supabase.com, then apply the migrations from your machine:
   `npx supabase link --project-ref <your-project-ref>` and `npm run db:push`.
2. **Supabase auth settings** (see "Login and access" above): turn off sign-ups, set the Site URL and add `https://<your-domain>/auth/confirm` as a redirect URL.
3. **Create Karina's login** (see "Creating an admin").
4. **Vercel > Project > Settings > Environment Variables**, for Production and Preview:

   | Variable | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API > `anon` `public` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > `service_role` key (secret: never prefix with `NEXT_PUBLIC_`) |
   | `SITE_URL` | The site's address, e.g. `https://consciousconnections.ie` |
   | `EMAIL_FROM` | e.g. `Conscious Connections <no-reply@consciousconnections.ie>` |
   | `CRON_SECRET` | Any long random string, e.g. from `openssl rand -hex 32`. Vercel sends it to the daily cleanup job |
   | `RESEND_API_KEY` | Optional; without it emails are only logged (from milestone 4) |

5. **Redeploy.** `NEXT_PUBLIC_` values are built into the site, so they only take effect in a new deployment.

`vercel.json` pins the Next.js framework preset and schedules the daily cleanup job (see "Data retention"). If the Supabase settings are missing, every page shows a "not connected to its database yet" page (`/setup`) listing which settings are missing, instead of a server error.

## Environment variables

See [`.env.example`](.env.example). `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must never be exposed to the browser: it is only read in `lib/supabase/admin.ts` (marked `server-only`) and in `scripts/`.

## Project structure

```
app/                 Next.js routes (admin screens under app/admin)
components/          Shared UI components
lib/supabase/        Browser, server and service-role clients + generated DB types
lib/events/          Event business rules (status transitions, host links, attention items, retention)
lib/content/         Website content helpers (images, YouTube links, formatting)
lib/email/           EmailService and templates
app/api/cron/        Daily data-retention job (Vercel Cron)
scripts/             Seed, retention runner and tests (browser tests in scripts/e2e/)
supabase/migrations/ SQL migrations
docs/                Spec, PRD, wireframes and plan
```
