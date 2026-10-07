# Conscious Connections admin: build plan

## Where the code lives
- Repo: `ayush1817-lab/Conscious_connection` (the only matching repo on your GitHub).
- It currently holds a small Vite/React mockup of the public site. I'm moving it into `prototype/` untouched and putting the Next.js app at the repo root, so nothing is lost.
- The spec points at `docs/`, which didn't exist. I'm adding `docs/admin-build-spec.md`, `docs/conscious-connections-prd-lofi.md` and the four wireframe images in `docs/lofi/`.
- Work goes on a branch with a draft PR per milestone (or one PR updated per milestone).

## Milestones (from spec section 12)
1. **Foundation** — Next.js (App Router, TS), Tailwind with all theme tokens in `globals.css`, Supabase server/browser/admin clients, one SQL migration with every table, enum, RLS policy, `is_admin()`, storage buckets, `npm run seed`, README skeleton, and an RLS test (`npm run test:rls`) proving anon can't read private tables.
2. **Auth** — A0 login + forgot password, middleware on `/admin`, "You don't have access" for non-admins, log out.
3. **Events overview** — A1 and A2 with live counts, all sections, empty states, mobile layout, New badge.
4. **Review flow** — A3, A4, A5, single status-transition function, EmailService (console + `email_log`, Resend when keyed), E2/E3/E4.
5. **Live events + attention** — A6, A7, take down, cancel, regenerate link, mark as seen, contact-request decisions, E9/E10/E11.
6. **Website content** — A8 (Homepage, Stories, Podcasts, Gallery, About) with Storage uploads.
7. **Retention + polish** — daily cleanup (Vercel Cron route with secret), accessibility pass, loading/error states, README complete.

## Conflicts found between spec and wireframes (how I'm handling each)
| # | Conflict | Decision |
|---|---|---|
| 1 | A8: wireframe/PRD have an **About** tab; spec lists only Homepage, Stories, Podcasts, Gallery | Include About, stored as `site_sections` with `page = 'about'` (schema already supports it) |
| 2 | A2: wireframe shows **Mark as seen** on contact-request rows too; spec says only Updates get it | Spec wins: contact requests need a decision, no Mark as seen |
| 3 | A4: wireframe button says "Send"; spec says action name ("Send and decline") | Spec wins |
| 4 | A6: wireframe has Details / Activity log tabs and no registrant list or Regenerate link | Wireframe layout (tabs) + spec behaviour (registrant names, Regenerate host link) |
| 5 | A8 Homepage: wireframe edits inline with preview beside it; spec says each section "opens an editor" | Layout follows wireframe: inline editor with side preview |
| 6 | Poster max size: H1 wireframe says 3MB, spec says 5MB | Spec wins (5MB) |
| 7 | Sample event: wireframe 10:00–12:00, capacity 20, Ballyalla Woods; spec 11:00–13:00, capacity 15, Ennistymon | Seed uses the spec values |
| 8 | Email flow image numbers emails H1–H5 / V1–V3 and splits registration confirmation from the address email; PRD/spec use E1–E11 with one E8 | Phase 1 uses spec IDs; the split is a public-site question for later |
| 9 | Email flow image sends the **host** an email when Karina cancels; spec only emails registrants (E9) | Spec wins for now; flagged for you |
| 10 | Host wireframe H3b has the host pick **one registrant** per contact request; spec E10 shares **all** registrant names and emails | Spec wins (no registrant column on contact_requests); flagged for you |
| 11 | Spec says tokens are "mapped in `tailwind.config`"; current Tailwind (v4) has no config file | Tokens live only in `app/globals.css` (CSS variables + `@theme`), which keeps the spirit: one place |
| 12 | E2 (email flow image) has an "Edit your event" link, but the spec only creates the private link on approval | Request changes also creates a private link and puts it in E2, so the host can fix and resubmit. Approving later replaces it with a new link in E4 |

## Decided with ayush
- Taking down an event emails only the host (E11), not registered people (2026-10-07).

## Open questions (flagged, not decided)
- Does a second team member get an admin login? (Schema supports many admins.)
- Exact review time promised to hosts (currently "24–48 hours").
- Should Karina cancelling also email the host (conflict 9)?
- Should a contact request share one registrant or all of them (conflict 10)?
- Host emails say "you can reply to this email" but come from a no-reply address. Set `EMAIL_REPLY_TO` to the inbox replies should reach.
