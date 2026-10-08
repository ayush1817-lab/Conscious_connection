# How it all connects

A plain-language guide to how the Conscious Connections website works once it is live. No code knowledge needed.

## The pieces

| Piece | What it is | Who uses it |
|---|---|---|
| **Public website** | The pages anyone can visit: homepage, events, stories, podcasts, gallery, about, "Host an event" | Visitors and hosts |
| **Host pages** | A private page for each event, opened only from the link in the host's email | The host of that event |
| **Admin site** | The same website address followed by `/admin`, behind a login | Karina (and any other admin) |
| **Supabase** | The database (events, registrations, stories and so on) plus file storage for posters and photos | Everything above reads and writes here |
| **Resend** | The email service that actually delivers the emails | Sends on behalf of the website |
| **Vercel** | The hosting company that runs the website and a small nightly clean-up job | Runs everything |

These are **one website**, not three. The public site, host pages and admin site are different areas of the same app, hosted together on Vercel and sharing one Supabase database. That is why a change Karina saves in the admin shows on the public site straight away: there is nothing to copy across.

```
 Visitor ──┐                          ┌── Supabase database (events, people, content)
 Host ─────┼──>  Website on Vercel  ──┼── Supabase storage (posters, photos)
 Karina ───┘   (public, host, admin)  └── Resend (sends the emails)
                      ▲
                      └── Nightly clean-up at 03:00 (Vercel Cron)
```

## Who can see what

- **Visitors** only ever see live, upcoming events and published content. The database itself enforces this, so even a mistake in a page can't show a pending event or anyone's private details.
- **Hosts** see only their own event, and only through their private link. They see the names of people who registered, never their emails.
- **Karina** sees everything after logging in, including host contact details and who registered.
- **Exact addresses** are never on the public site. Only people who register get the address, in their confirmation email.

## A visitor registers for an event

1. They find an event on `/events` (filter by county and "this week" or "this month").
2. They enter their name and email and tick consent.
3. The database checks, in one step, that the event is still live and has room, then saves the place. Two people can't take the last place at the same moment.
4. Resend emails them the confirmation **with the exact address**.
5. If they register again with the same email, they just get the email again, not a second place.

## A host submits an event

1. They fill in "Host an event": public details (title, county, date, description, optional poster) and private details "Only visible to Karina" (their name, email, phone, exact address).
2. The event is saved as **pending**. Nothing is public yet.
3. The host gets an email saying it was received; Karina gets an email saying there's a new request.

## Karina reviews it (admin site)

Karina logs in at `/admin`, opens **Events**, and picks one of three:

- **Approve:** the event goes live on the public site straight away, and the host gets an email with their **private link**.
- **Request changes:** Karina writes what to change; the host gets an email with the reason and a private link to fix it and resubmit.
- **Decline:** Karina writes why; the host gets an email with the reason.

## The host manages their event (host pages)

The private link opens a page only that host can use. There's no password: the link is the key, so hosts are told to keep the email safe.

- **Needs changes:** see Karina's note, edit, and resubmit for review.
- **Waiting for review:** a read-only summary.
- **Live:** edit details (Karina gets an email and a before/after list of what changed), see the names of who registered, ask Karina for registrants' contact details (Karina decides), or cancel the event (everyone registered gets an email, and so does Karina).
- Once people have registered, date, time, county and address are locked so nobody turns up to the wrong place. (This rule can be switched off; it's still being confirmed.)
- **Lost the link?** `/host/resend` emails a fresh link for each active event. The page gives the same answer whether or not the email belongs to a host, so it can't be used to find out who hosts. The old link stops working.

## Karina keeps an eye on live events

The admin **Events** page shows new requests, things that need attention (host edits, cancellations, contact requests), upcoming events with how many registered, and recent past events. Karina can take an event down (only the host is emailed) or cancel it (the host and everyone registered are emailed).

She also edits the homepage sections, About page, stories, podcasts and gallery under **Website content**. Saves show on the public site at once.

## Emails

Every email the site sends goes through Resend and a copy is kept in the database (`email_log`) so Karina can check "did the host get my email?". Copies are deleted after 30 days.

| When | Who gets it |
|---|---|
| Event submitted | Host (received) and Karina (new request) |
| Approved, changes requested, declined | Host |
| Host edits, cancels or asks for contact details | Karina |
| Event cancelled | Everyone registered |
| Taken down by Karina | Host only |
| Someone registers | That person, with the address |
| Lost link | Host, with a fresh link |

Without a Resend key (for example on a developer's computer), emails aren't sent; they're only written to the log.

## Privacy clean-up (every night)

At 03:00 Vercel runs a clean-up. For every event that ended more than 7 days ago it deletes the registrations, the host's private details, contact requests and edit history, and switches off the host link. The event's public details stay so events can still be counted. Email copies older than 30 days are deleted too.

## Protection against spam and abuse

- Forms have a hidden field that only bots fill in; those submissions are quietly ignored.
- Each visitor is limited per hour: 5 event submissions, 10 registrations, 3 link requests.
- Admin and host pages are hidden from search engines.

## What's needed to go live

1. A **Supabase** project: run `npm run db:push` to set up the database, then create Karina's login.
2. A **Resend** account with the sending domain verified, and its key added to Vercel.
3. **Vercel** settings: the Supabase keys, `SITE_URL` (the real address, so email links work), `CRON_SECRET`, and optionally `ADMIN_NOTIFY_EMAIL` (where Karina's notifications go) and `EMAIL_REPLY_TO`.
4. Karina reviews the privacy page wording.

The full list of settings is in the README under "Deploying to Vercel".
