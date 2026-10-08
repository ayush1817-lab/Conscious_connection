# Public and host website: build plan

Spec: [`public-site-build-spec.md`](public-site-build-spec.md). Wireframes: [`lofi/public-wireframes.png`](lofi/public-wireframes.png).
Same Next.js app and Supabase database as the admin site. One branch and PR per milestone.

## Milestones (spec section 13)
1. **Layout and content pages:** warm temporary theme, header, footer, mobile menu, homepage, About, Privacy, Stories, Podcasts, Gallery, 404, and admin saves refreshing the public site.
2. **Events browsing:** events list with county and date filters, event page with every state, share previews, poster placeholder.
3. **Registration:** sign-up form, `register_for_event` database function, duplicate handling, E8 email with the address.
4. **Submission:** host form, `submit_event` database function, poster upload, E1 and E5, spam protection.
5. **Host private page:** every status and tab, edits with before/after, lock rule, cancel, contact requests, E6, E7, E9.
6. **Resend link and hardening:** resend page, rate limits, headers, accessibility pass, tests, README.

## Where the real schema differs from the spec
| # | Difference | How I'm handling it |
|---|---|---|
| 1 | Counties are stored as display names (`Co. Clare`); the spec's filter uses `?county=clare` | `lib/counties.ts` holds slug + name; the database keeps the name, the URL uses the slug |
| 2 | No `rate_limits` table | New migration adds it (milestone 4), with a function that counts and records a hit in one step |
| 3 | No `register_for_event` or `submit_event` functions | New migrations (milestones 3 and 4) |
| 4 | `registrations` has no unique email per event | The function handles duplicates (case-insensitive); a unique index backs it up |
| 5 | The public (anon) role can't count registrations, so it can't show "X places left" | The server counts with the service role and only ever sends the number of places left, never names |
| 6 | `admins` has no email column | Admin notification emails go to `ADMIN_NOTIFY_EMAIL`, or, if unset, to the email of every admin login |
| 7 | Email templates only cover E2–E11 | Adding E1, E5, E6, E7, E8 in the same style |
| 8 | Spec 10.1 (request changes issues a host link) | Already done in the admin build; the host page handles `needs_changes` |

## Where the wireframes and spec disagree
| # | Conflict | What I'm doing |
|---|---|---|
| 1 | Wireframes show an **Event type** filter and field (Outdoor / Social), plus "What to bring", "Accessibility" and "Questions?" on the event page. Neither the spec nor the schema has these fields | Left out; the description covers them for now. Flagged |
| 2 | Event page wireframe shows "8 of 12 registered"; spec says show "X places left" only when fewer than 5 remain | Spec wins |
| 3 | Event list wireframe has a search box and a sort menu; spec doesn't | Left out (filters and soonest-first only). Flagged |
| 4 | Host form button says "Review and submit" (desktop) / "Preview event" (mobile); spec says "Submit event for review" | Spec wins. One form; the mobile wireframe's numbered sections are kept as numbered headings |
| 5 | Footer has a **Contact** link; there is no contact page or address in the spec | Left out until there's an address to use. Flagged |
| 6 | Event page wireframe shows a "Hosted by" card | Shown as "Hosted by a member of the community", with no name, so no host details are public |
| 7 | Wireframe H1 says posters "JPG, PNG up to 5MB" | Spec wins: JPG, PNG or WebP up to 5MB |
| 8 | Header button says "Get Involved"; the spec's only call to action is hosting | Button says "Host an event", so it's clear where it goes |

## Freshness
Public pages render on every request (no build-time caching), and admin saves also call `revalidatePath("/", "layout")`, so Karina's edits show at once.

## Open questions (flagged, not decided)
From the spec:
1. Lock date, time, county and address once people have registered? Built behind `LOCK_KEY_FIELDS_WHEN_REGISTERED=true` until confirmed.
2. Counties: Republic of Ireland only for now. Include Northern Ireland? An "Online" option?
3. A "Leave this site quickly" button?
4. Privacy page wording: placeholder marked "Karina to review", ideally with GDPR advice.
5. Review time promised to hosts: currently "24–48 hours".

New ones:
6. Event type, what to bring and accessibility fields from the wireframes: add them to the form and database?
7. Contact link in the footer: which email address?
8. Posters uploaded on a submission that is never sent stay in Storage. Clean them up in the daily job?
