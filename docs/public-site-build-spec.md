# Conscious Connections – Public & Host Website Build Spec (Phase 2)

> **For Claude Code.** This builds the website visitors and hosts use. It lives in the **same Next.js project and Supabase database** as the admin site (see `admin-build-spec.md`).
>
> **Before writing code:**
> 1. Read this spec, `admin-build-spec.md`, `docs/conscious-connections-prd-lofi.md` and the wireframes in `docs/lofi/`.
> 2. Inspect the **existing migrations and code** in the repo. The real schema wins over the schema described in these documents. Where they differ, adapt this spec to the real schema and list the differences.
> 3. Propose a plan, then build milestone by milestone (section 13).

## 0. Reference rules

- **Wireframes** (P1–P8, H1–H6) decide page structure and layout.
- **This spec** decides behaviour, data, privacy and security.
- Report conflicts instead of silently choosing.

## 1. Context and goals

Conscious Connections is a community for women and non-binary people in rural Ireland. The public website must:
1. Help people **discover events discreetly**, with no accounts.
2. Let **anyone submit an event**, which Karina approves in the admin site.
3. Let hosts **manage their event through a private link**, with no account.
4. Show Karina's content: homepage, stories, podcasts, gallery.
5. **Grow the community:** event pages should look good when shared on WhatsApp, Instagram and Facebook.

## 2. Design principles (apply to every decision)

1. **Discreet by default.** Never show an exact address, host contact details or registrant names publicly. Use neutral, friendly wording.
2. **Details are revealed on registration.** The exact address is only ever sent by email.
3. **No accounts for visitors or hosts.**
4. **Plain language.** Short sentences, no jargon, warm tone.
5. **Mobile-first.** Most visitors and hosts will use phones, often on slow rural connections. Keep pages light.

## 3. Theme

Reuse the token system from the admin build (one file of CSS variables). **No hard-coded colours.** The public site may add tokens (e.g. a hero background) but must define them in the same place. The final visual design will replace the theme later.

## 4. Routes

| Route | Screen | Notes |
|---|---|---|
| `/` | P1 Homepage | Content from `site_sections`, next 3 events, latest stories, latest podcast, gallery strip |
| `/events` | P2 Events listing | Filters via query params: `?county=clare&when=month` |
| `/events/[id]` | P3 Event detail | Includes the registration form (P4) inline or as a step |
| `/events/[id]/registered` | P5 Registration confirmed | |
| `/stories`, `/stories/[slug]` | P6 | Published only |
| `/podcasts` | P7 | YouTube embeds, published only |
| `/gallery` | P8 | |
| `/about` | About | From `site_sections` (`page = 'about'`) |
| `/privacy` | Privacy page | Placeholder text, clearly marked "Karina to review" |
| `/submit-event` | H1 Submit form | |
| `/submit-event/thanks` | H2 Submitted confirmation | |
| `/host/[token]` | H3 Private host page | Must match the link format the admin site already emails |
| `/host/resend` | H6 Resend my link | |
| any invalid host token | H5 Link not active | |
| 404 | Friendly not-found page | Link to events and homepage |

## 5. Shared rules

- **Counties:** one constant list in `lib/counties.ts` (the 26 counties of the Republic of Ireland for now; see open questions). Used by filters, forms and display.
- **Time zone:** store UTC; display everything in `Europe/Dublin`. Format dates like "Sat 14 Nov, 11:00–13:00".
- **Visible events:** `status = 'live'` and `end_at > now()`. Nothing else is ever shown publicly.
- **Poster fallback:** events without a poster get a branded placeholder (token-based, shows the county and date). Never a broken image.
- **Freshness:** admin edits must appear on the public site immediately. Use dynamic rendering or on-demand revalidation (`revalidatePath`), and add the revalidation calls to admin save actions.
- **SEO and sharing:**
  - Public pages: proper `<title>`, meta description, Open Graph and Twitter tags. Event pages use the poster (or placeholder), title, county and date in their share preview.
  - `/host/*`, `/submit-event/thanks`, `/events/[id]/registered`: `noindex`.
  - Host pages also send `Referrer-Policy: no-referrer` so the private token never leaks through links.
- **Accessibility:** WCAG AA contrast, labels on every field, visible focus states, error messages linked to their fields, minimum 44px tap targets, works with a screen reader.
- **Performance:** optimised images (`next/image`), no heavy client libraries on public pages, YouTube embeds load lazily (click-to-load thumbnail).

## 6. Security for public writes

All writes from the public site go through **server actions or route handlers** using the service role, never the browser client.

- Validate every input server-side with a schema (e.g. zod). Enforce the same max lengths as the database.
- **Spam protection** on H1, P4 and H6: a hidden honeypot field, plus **rate limiting** per IP (e.g. a small `rate_limits` table or a middleware limiter). Suggested limits: 5 submissions/hour, 10 registrations/hour, 3 link resends/hour. Leave a clear hook to add Cloudflare Turnstile later if spam appears.
- **Host tokens:** the URL contains the raw token. Hash it (SHA-256) and compare with `host_edit_token_hash` using a constant-time comparison. Never log tokens.
- **Poster uploads:** JPG/PNG/WebP, max 5MB, validated server-side. Upload through a server-generated signed URL. Use random file names (UUIDs).
- Never return private data (address, host contact, registrant details) to any public page or API response.

## 7. Visitor flow: discovering and registering

**P2 – Events listing**
- Cards: poster, title, **county only**, date and start–end time. Soonest first.
- Filters: county (dropdown, "All counties"), when ("This week", "This month", "All upcoming").
- Pagination or "Load more" after 12 events.
- Empty state: "No events in [county] yet. Want to host the first one?" → `/submit-event`.

**P3 – Event detail**
- Poster, title, county, date, times, description.
- Note: "The exact location is shared by email when you register."
- If `capacity` is set, show "X places left" only when fewer than 5 remain. If full: disabled "Event full".
- If the event isn't visible (cancelled, taken down, expired, pending): show "This event is no longer running" + link to `/events`. Return HTTP 404/410 status for SEO.
- A share button (Web Share API, with a copy-link fallback).

**P4 – Registration**
- Fields: name ("A first name or nickname is fine"), email.
- Privacy line: "We only use your email to send you the event details. The host sees your name only. Your details are deleted 7 days after the event." Link to `/privacy`.
- Consent checkbox (required). Store `consented_at`.
- **Capacity must be enforced atomically.** Use a Postgres function (e.g. `register_for_event`) that locks the event row, checks status, end time and capacity, and inserts the registration in one transaction.
- **Same email registering twice for the same event:** don't create a duplicate; just re-send E8.
- On success, send **E8** to the registrant and redirect to P5.

**P5 – Registration confirmed**
"Check your email. We've sent the address and details for [event]." Mention the spam folder. Link back to events. Don't display the address here.

## 8. Host flow: submitting

**H1 – Submit an event** (`/submit-event`)
Two visually distinct sections:
- **Public details – "Visible to everyone":** title (max 120), county, date, start time, end time (must be after start; event must be in the future), description (max 500), poster (optional), capacity (optional, 1–500).
- **Private details – "Only visible to Karina"** (private colour tint + lock icon): exact address ("Never shown publicly"), host name, email, phone, about your group (required, max 300), emergency contact name and phone ("Only used if something goes wrong on the day").
- Privacy line + required consent checkbox.
- Button: **Submit event for review**.
- Show inline errors, keep entered values on error, and scroll to the first error.
- Warn before leaving the page with unsaved input.

On submit, in **one transaction** (Postgres function): insert `events` (`status = 'pending'`, `submitted_at`) and `event_private_details`. Then send **E1** to the host and **E5** to the admin email(s).

**H2 – Submitted confirmation** (`/submit-event/thanks`)
- "Your event has been submitted."
- What happens next: Karina reviews it (usually within 24–48 hours) → if approved, it goes live → you get an email with a **private link** to manage your event.
- "Check your spam folder. Keep that email safe, as it's your link to edit or cancel."
- **No dashboard, no "my events", no account language anywhere.**
- Buttons: "Back to home", "Submit another event".

## 9. Host flow: the private page

**H3 – `/host/[token]`**
Resolve the token to an event. The page shows **one event only**, with no navigation to other events and no avatar. Top of page: event title and a status bar.

The page changes by status:

| Status | What the host sees |
|---|---|
| `needs_changes` | Karina's reason at the top. Editable form (same fields as H1). Button **Resubmit for review** → status `pending`, send E5 to admin. |
| `pending` | "Waiting for Karina's review." Read-only summary. |
| `live` (upcoming) | Full page with tabs (below). Status bar: "Live · 6 registered". |
| `live` (ended), `cancelled`, `taken_down`, `declined`, or token invalid/cleared | H5 message |

Tabs for a live event:
- **Event details:** same public/private split as H1.
  - **If anyone has registered, lock** date, start time, end time, county and exact address. Show a lock icon and the note: "These can't be changed because people have already registered. To change them, cancel this event and submit a new one." Put this rule behind a config flag (`LOCK_KEY_FIELDS_WHEN_REGISTERED=true`) because it's still being confirmed.
  - **Save changes**, with the note "Changes go live immediately. Karina will be notified."
  - On save: update the event, write an `event_edits` row with a `{ field: { before, after } }` diff (only changed fields), create an `attention_items` row (`host_edited`, update), and send **E6** to the admin. If nothing changed, say so and do nothing.
- **Registrations:** count + list of **names only**.
- **Request contact details:** reason field + button. Creates `contact_requests` and an `attention_items` row (`contact_request`, needs decision), and sends **E7** to the admin. Afterwards, show the request status (requested / shared / declined). Allow only one open request at a time.

**Cancel event** (separate, destructive button) → **H4** dialog: "Cancel this event? The 6 people registered will be emailed. This can't be undone." Buttons: "Keep event" / "Cancel event".
On confirm: status `cancelled`, send **E9** to every registrant, create `attention_items` (`host_cancelled`), send **E7** to the admin, log `event_activity` (actor `host`). Then show the cancelled state.

**H5 – Link not active**
"This link is no longer active." Explain the likely reason (the event has ended, been cancelled or been removed, or a newer link was sent). Link to **H6** and to the homepage. Never reveal whether a given token ever existed.

**H6 – Resend my link** (`/host/resend`)
- Email field.
- If that email is the host of any event with status `live` (upcoming) or `needs_changes`: **generate a new token per event** (invalidating the old one) and email it (E4, or E2 for needs-changes events).
- **Always show the same message:** "If there's an active event for this email, we've sent the link." Never reveal whether the email exists.

## 10. Required changes to the admin site

1. **Request changes must issue a host link.** The host has no link before approval, so they couldn't resubmit. When Karina requests changes, generate a token (store its hash) and include the private link in **E2**. The H3 page handles the `needs_changes` state.
2. Add **revalidation** calls to admin actions that change public content (events, sections, stories, podcasts, gallery).
3. Make sure the admin "Attention" list and counts pick up the new rows created by host actions.

## 11. Emails added in this phase

Same `EmailService` and template style as the admin build: plain, warm, short.

| ID | Trigger | To | Content |
|---|---|---|---|
| E1 | Event submitted | Host | Received, what happens next, review time, "check spam" |
| E5 | New submission / resubmission | Admin(s) | Event summary + link to admin A3 |
| E6 | Host edited a live event | Admin(s) | Before → after summary + link to A7 |
| E7 | Host cancelled / contact request | Admin(s) | Summary + link to A7 |
| E8 | Visitor registered | Registrant | Title, date, times, **exact address**, host first name only, "we'll delete your details 7 days after the event" |
| E9 | Host cancelled | Each registrant | Event cancelled, apology, link to other events |
| E2/E4 | Link resend (H6) | Host | Same templates as the admin site, with the new link |

Admin email address(es) come from the `admins` table or an `ADMIN_NOTIFY_EMAIL` env var.

## 12. Seed data and testing

- Extend the existing seed script with: a live event at capacity, a live event with 1 place left, an event with no poster, a needs-changes event with a known test token, and a live event with a known test token (print both test host links in the seed output).
- Write tests for the critical rules:
  - capacity is never exceeded under concurrent registration,
  - private fields never appear in public responses,
  - locked fields can't be changed server-side even if the form is tampered with,
  - invalid, cleared and old tokens all show H5,
  - resend responses are identical whether or not the email exists.

## 13. Milestones

After each, run the app, check the criteria, and summarise what changed and anything unresolved.

1. **Layout and content pages:** shared header, footer and mobile menu; P1, `/about`, `/privacy`, P6, P7, P8, 404. Revalidation from admin.
   *Done when:* content edited in admin appears on the public site immediately; all pages work at 360px.
2. **Events browsing:** P2 with filters and pagination, P3 with all states, share previews, poster placeholder.
   *Done when:* only live upcoming events appear; no private data is reachable; share previews look right.
3. **Registration:** P4, P5, `register_for_event` function, duplicate handling, E8.
   *Done when:* capacity holds under concurrent tests; E8 contains the address; the address never appears on any page.
4. **Submission:** H1, H2, transaction function, poster upload, E1/E5, spam protection.
   *Done when:* a submitted event appears in admin as a new request with all private details.
5. **Host private page:** H3 (all states and tabs), H4, H5, edits with diff, lock rule, cancel, contact requests, E6/E7/E9, and the admin change for needs-changes links.
   *Done when:* every host action shows up correctly in the admin Attention list.
6. **Resend link and hardening:** H6, rate limits, headers, accessibility pass, tests from section 12, README update.

## 14. Out of scope

- Visitor or host accounts, community chat, payments, recurring events.
- Reminder emails and change-notification emails to registrants.
- Final visual design and branding.

## 15. Open questions (flag, don't decide)

1. **Locking key fields** once people register is an assumption until change notifications are confirmed (hence the config flag).
2. **Counties:** Republic of Ireland only, or include Northern Ireland? Is an "Online" option needed?
3. **Quick exit button:** sites for communities with safety concerns often have a "Leave this site quickly" button that jumps to a neutral page. Should this site have one? (Design only on request.)
4. **Privacy page wording** must be reviewed by Karina, ideally with GDPR advice.
5. **Review time promise** shown to hosts (currently "24–48 hours").
