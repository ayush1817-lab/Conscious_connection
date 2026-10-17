# Client feedback changes (October 2026)

Changes made for the team's October 2026 feedback on the site. They're split
across two pull requests: P0 (tasks 1 to 3) and P1 to P3 (tasks 4 to 12).

## What changed

| # | Change | Where to see it |
|---|--------|-----------------|
| 1 | **Emails.** Two problems stopped emails being sent. A missing `SITE_URL` made the action fail after the save. A missing `RESEND_API_KEY` made the live site quietly print emails to a log instead of sending them. Now the site falls back to the Vercel address. On Vercel, a missing key or a failed send is logged and recorded, but the visitor's action still succeeds. New emails: "change request received" to the host and the admins (E12), plus "story received", "story published" and "story declined". | Admin > **Emails** shows the set-up checks, sending-domain status, a test send and the last 40 emails |
| 2 | **Admin feedback.** Publish, Save, Approve, Mark as seen and the gallery move buttons show progress ("Publishing…"), can't be pressed twice, and finish with a message. Publishing a story or podcast goes back to the list. | Admin > Website content |
| 3 | **Event submission confirmation.** The form shows a spinner while sending. Afterwards it is replaced by: "Thanks! Your event has been submitted and we'll review it shortly. We'll email you once it's approved." Errors stay on the form. | /submit-event |
| 4 | **No personal name.** Site and email wording now says "our team" or "we". | Everywhere |
| 5 | **No emergency contact.** Removed from the host form and its checks. The database columns stay but are now optional. | /submit-event, host page |
| 6 | **Event photos.** Three photo slots on the homepage ("Moments from our events") and three on the About page. Each photo needs a description (alt text). Images are resized in the browser (at most 2000px, WebP) and served responsive and lazy-loaded. | Admin > Website content > Homepage / About |
| 7 | **Share your story.** A public form with title, story, optional or anonymous name, email, optional image, consent, a honeypot and a rate limit. Submissions wait in a review queue, where the admin can approve (this publishes the story and opens it for editing) or decline with a reason. The writer sees a confirmation on screen and gets emails at each step. | /stories/share, Admin > Website content > Stories |
| 8 | **Weekly events.** "Does it repeat?" (every week) with an optional last date. The listing shows the next date and a label like "Every Thursday, 7pm". People pick which date they're coming to, and places, duplicates and the 7-day clean-up all work per date. Times stay the same across clock changes. | /submit-event, event pages, new **Edit event** page in the admin |
| 9 | **External registration link.** An optional link. When it's set, the event page shows a "Register here" button (opens in a new tab) and "This event requires registration via an external site" instead of our form. Only http(s) links are accepted. | /submit-event, host page, admin editor |
| 10 | **Podcasts from Spotify or an audio file.** The podcast form asks "Where is the episode?": YouTube, Spotify (episode links, `?si=` codes are fine) or an uploaded MP3/M4A of up to 50MB. Audio plays in a labelled player with a download link. | Admin > Website content > Podcasts, /podcasts |
| 11 | **Editable page content.** The homepage's three "What we're about" cards are now editable. A new **Other pages** tab edits the title and introduction of the Events, Stories, Share your story, Podcasts, Gallery and Host an event pages. The built-in wording is the fallback, and saving updates the site at once. | Admin > Website content |
| 12 | **Attendee list.** Before this change, admins saw registrants' names only. The admin event page now lists name, email and registration time, grouped by date for weekly events. There's a CSV download for everyone or one date, and each download is logged. Host-to-attendee messaging is still waiting on a decision and isn't built. | Admin > Events > an event |

Small fixes found along the way:
- Muted text is a little darker, so it keeps 4.5:1 contrast on the homepage's lilac waves.
- On a 360px phone, admin gallery cards were 24px too wide. They now fit.
- Content sections the editor creates now appear straight away, without a reload.

## Environment variables (Vercel > Settings > Environment Variables)

| Name | Needed? | What it does |
|------|---------|--------------|
| `RESEND_API_KEY` | **Yes, on Vercel** | Without it, no email is sent (Admin > Emails shows this). |
| `EMAIL_FROM` | Yes | For example `Conscious Connections <no-reply@consciousconnections.ie>`. The domain must be verified in Resend > Domains (SPF and DKIM records; DMARC recommended). |
| `SITE_URL` | Yes | The live address, for example `https://consciousconnections.ie`. It's used in email links. If it's missing, the Vercel address is used and an error is logged. |
| `EMAIL_REPLY_TO` | Optional | Where replies to emails go (the team inbox). |
| `ADMIN_NOTIFY_EMAIL` | Optional | Who gets admin notifications (comma-separated). Without it, every admin login's email gets them. |
| `EMAIL_PROVIDER` | Optional, new | Set it to `console` on a test deployment to print emails instead of sending them. |

Redeploy after changing these, then use **Admin > Emails > Send a test email**.

## Database changes

New migrations, in order:

1. `20261017000000_optional_emergency_contact.sql`: the emergency contact columns become optional.
2. `20261017000100_section_photos.sql`: adds `site_sections.image_alt` and the photo slot rows.
3. `20261017000200_story_submissions.sql`: adds the `story_submissions` table (admin-only), `stories.author_name`, and clearing submitter emails 30 days after a decision.
4. `20261017000300_recurring_events.sql`:
   - Adds `events.recurrence_rule` (JSON, for example `{"freq":"weekly","interval":1}`), `recurrence_until` and `series_end_at`.
   - Adds the `event_listing` view and `registrations.occurrence_start`.
   - Adds per-date places (`occurrence_places_left`).
   - Updates `register_for_event`, `submit_event` (new optional `p_extra`), the host functions and retention.
5. `20261017000400_external_registration.sql`: adds `events.external_registration_url`.
6. `20261017000500_podcast_sources.sql`: adds `podcasts.source`, `spotify_url` and `audio_path`, and the public `podcasts` storage bucket (admin-only uploads).

**Live database:** open Supabase > SQL Editor > New query, paste
`apply-database-updates.sql` (in the project files under `client-feedback/`)
and press Run. It runs as one transaction, skips anything already in place, and
can be run again safely. Run it **before** deploying the new code. (Tested
locally: a database at the earlier version, after this file, has exactly the
same schema as one built from all migrations, and a second run changes nothing.)

Fortnightly and monthly repeats are allowed for in the data, since the rule is
JSON, but a database check only accepts weekly for now. Adding them later means
a migration that relaxes the check, plus the option in the form.

## Checks

- `npm run lint` (type check) and `npm run build` both pass.
- Every test suite passes locally: `npm run test:transitions`, `test:rls`, `test:retention`, `test:registration`, and the browser suites (`test:auth`, `overview`, `review`, `live`, `content`, `a11y`, `public`, `register`, `submit`, `host`, `resend`, `stories`, `recurring`, `external`, `podcasts`, `page-content`, `attendees`).
- New browser suites: `test:stories`, `test:recurring`, `test:external`, `test:podcasts` (uses the Spotify example link), `test:page-content` and `test:attendees`.
- Browser suites need the app running and `CHROMIUM_PATH` set to a Chromium binary.

## Still to confirm

- **Emails in production:** they can only be confirmed on the live site. Set the variables above, verify the domain in Resend, redeploy, then send a test from Admin > Emails and submit a real event.
- **Event photos:** the slots are ready. Add photos in Admin > Website content > Homepage and About.
- **Pending decisions (not built):** fortnightly and monthly repeats, and host-to-attendee messaging.
