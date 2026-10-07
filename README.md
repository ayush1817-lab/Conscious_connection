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
| `npm run test:rls` | Check Row Level Security against seeded data |
| `npm run test:auth` | Browser test of login, log out, non-admin block and forgot password (app must be running) |
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

_To be completed in milestone 7._ In short: create a Supabase project and push migrations, import the repo in Vercel, and set the variables from `.env.example` (keep `SUPABASE_SERVICE_ROLE_KEY` server-only).

## Environment variables

See [`.env.example`](.env.example). `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must never be exposed to the browser: it is only read in `lib/supabase/admin.ts` (marked `server-only`) and in `scripts/`.

## Project structure

```
app/                 Next.js routes (admin screens under app/admin)
components/          Shared UI components
lib/supabase/        Browser, server and service-role clients + generated DB types
lib/events/          Event business rules (status transitions, host link tokens)
lib/email/           EmailService and templates (milestone 4)
scripts/             seed and RLS test
supabase/migrations/ SQL migrations
docs/                Spec, PRD, wireframes and plan
```
