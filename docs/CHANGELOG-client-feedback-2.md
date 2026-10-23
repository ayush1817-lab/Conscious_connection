# Karina's feedback, round two (October 2026)

## Wording and layout (PR #24, merged)
About text, "the island of Ireland", "LGBTQ+ women", the host box under Upcoming events, and "Stories and Poetry from our Community". The saved-text update is `client-feedback-2/update-site-wording.sql` in the project files.

## Community Guidelines
- New page at **/guidelines** with two parts: "Hosting and attending events" (`/guidelines#events`) and "Sharing stories and poetry" (`/guidelines#stories`).
- The team writes both in **Admin > Website content > Guidelines**. Up to 20,000 characters each, with `## ` sub-headings and `* ` bullet points. An empty part says "These guidelines are coming soon."
- Linked from the footer, the Events page, the Host an event form, the Stories page and the Share your story form.
- No database change (it uses `site_sections`, page `guidelines`).

## Photos from hosts
- The private host page has a new **Photos** tab. Hosts add up to 10 photos at a time (20 per event), each with an optional description. They must tick that everyone recognisable is happy to be shared. Photos are resized in the browser, and their location data is removed.
- After the event ends, the host link still opens for 7 days (until the daily clean-up clears it), but only to send photos. Before this change it showed "This link is no longer active".
- Photos go to a **private** storage bucket (`gallery-submissions`) and a `gallery_submissions` row (admin-only). The admins get email G1.
- **Admin > Website content > Gallery** shows "Photos to review" first. **Approve** (the caption can be edited first) copies the photo into the public gallery, at the end. **Decline** deletes the photo. The admin home counts waiting photos.
- The host's Photos tab shows each photo as "Waiting for our team", "In the gallery" or "Not used". No email is sent to the host.

## Database
Migration `20261023000000_gallery_submissions.sql`. Live: run `client-feedback-2/apply-database-updates.sql` in the Supabase SQL Editor **before** deploying. It is safe to run twice. Until it runs, the review list and the host's Photos tab are just empty; nothing breaks.

## Checks
`npm run lint`, `npm run build`, and the new `npm run test:gallery-photos` (39 checks). `test:host` was updated for the new ended-event page. `test:public`, `content`, `page-content`, `stories`, `a11y`, `rls`, `submit`, `resend`, `recurring`, `live`, `register` and `auth` pass. `test:retention`'s cron check needs `CRON_SECRET` set locally.
