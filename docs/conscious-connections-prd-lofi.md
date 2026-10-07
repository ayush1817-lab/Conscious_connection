# Conscious Connections Website: PRD for Low-Fidelity Wireframes

## Instructions for the wireframe generator

Create **low-fidelity wireframes** for every screen listed in section 7.

- **Greyscale only.** No brand colours, no styled fonts, no icons beyond simple placeholders. Use boxes, lines and labels. Image placeholders are boxes with an X.
- **Use the realistic sample content given** (section 9), not lorem ipsum.
- **Label every screen with its ID** (e.g. `H1`, `A3`) and title.
- **Add short annotations** next to anything non-obvious (privacy rules, locked fields, what a button triggers).
- **Show the flow:** after the screens, give a simple flow map linking screen IDs with arrows.
- **Viewports:** Public and Host screens are **mobile-first (390px wide)**. Admin screens are **desktop (1280px)**, plus mobile versions of A2 and A3 because the admin may review events on her phone.
- Work in three batches if needed: **Public → Host → Admin**, then emails.
- **Do not invent features** that aren't in this document. If something seems missing, list it as a question at the end instead of designing it.

---

## 1. Product summary

Conscious Connections is a community for women and non-binary people in rural Ireland, run by Karina. Her current website reads like a blog, is hard for visitors to understand, and is hard for her to keep up to date.

The new website will:
- Grow the community by letting **anyone host and submit events**, which Karina approves.
- Let visitors **discover events discreetly**, without accounts.
- Let Karina, who is **non-technical**, keep all content (events, gallery, stories, podcasts, homepage text) up to date herself.

**Success means:** Karina updates everything without outside help, external hosts regularly submit events that go live smoothly, and more people visit the site.

## 2. Users

| User | Goal | Key needs |
|---|---|---|
| **Host** | Share an event with the community | Simple form, clear what's public vs private, easy to edit or cancel later. No account. |
| **Visitor** | Find events safely and discreetly | Browse without signing up. Only give a name and email to get an event's address. |
| **Admin (Karina)** | Approve events and keep the site fresh | See what needs her attention instantly. Simple actions. Easy content editing. |

## 3. Design principles

1. **Discreet by default.** Nothing public should expose a host or attendee. Page titles and listings avoid sensitive wording.
2. **Details are revealed on registration.** Public pages show the county only. The exact address is emailed after a visitor registers.
3. **Updating content should be as easy as posting on Instagram.**
4. **Don't build what Karina can't maintain.**
5. **The host is responsible for their event's content.** Karina approves, requests changes, declines or takes down. She does not edit host content.

## 4. Key decisions

1. Anyone can submit an event. No host account.
2. Karina approves. A team member may act as backup.
3. No visitor accounts. Visitors register per event with a name (nickname allowed) and email.
4. Public listings show the **county only**. The exact address is emailed to registrants.
5. Podcasts are YouTube embeds, added by pasting a link.
6. Events disappear from the public site automatically after their **end time**.
7. Community chat is out of scope.
8. Karina's review actions: **Approve, Request changes, Decline.** Request changes and decline require a written reason, which is emailed to the host.
9. When approved, the host receives a **private edit link** by email. This link is the host's only way to manage the event.
10. Host edits on a live event **go live immediately**. Karina receives a notification with a **before → after summary**.
11. Hosts can **cancel directly** from the private link. Karina can also cancel from admin. All registrants are emailed on cancellation.
12. The host sees a **names-only** registrant list on the private link page. They can **request registrant contact details**. Karina decides whether to share them.
13. Registrant data and host private details are **deleted 7 days after the event ends**.
14. Past events stay visible in admin for 7 days, then disappear.
15. Karina's safety valve on live events is **Take down**.
16. No change-notification emails and no reminder emails in phase 1.

## 5. Event statuses

| Status | Trigger | Visible publicly? |
|---|---|---|
| Pending | Host submits, or resubmits after changes | No |
| Needs changes | Karina requests changes (with reason) | No |
| Declined | Karina declines (with reason) | No |
| Live | Karina approves | Yes |
| Cancelled | Host (private link) or Karina (admin) | No |
| Taken down | Karina removes it | No |
| Expired | Automatically after the end time | No (admin only, 7 days) |

## 6. Assumptions for open decisions

These are not final. Design with the assumption below and **annotate it as "assumption"** on the screen.

| Open question | Assumption to use |
|---|---|
| Change emails to registrants | None in phase 1. Therefore **date, start/end time, county and exact address are locked** on the host edit page once anyone has registered. To change them, the host cancels and resubmits. |
| Can a host edit a pending event? | No. They wait for review. Karina can request changes. |
| Host asking Karina to cancel | Not designed. Hosts cancel themselves via the private link. |
| Lost private link | Include a simple "Resend my link" page (enter email → link re-sent if an event exists). |
| Event capacity | Optional field on the form. If full, "Get details" becomes "Event full". |
| Emergency contact | Required, with a one-line explanation of why it's asked. |

## 7. Screens

### Public (visitor), mobile-first

**P1 – Homepage**
- Header: logo, menu (Events, Stories, Podcasts, Gallery, Host an event).
- Short intro to Conscious Connections and its purpose.
- "Upcoming events" preview: next 3 event cards + "See all events".
- "Host an event" call to action → H1.
- Latest stories (2–3), latest podcast (YouTube embed placeholder), gallery strip.
- Footer: privacy page link, contact.

**P2 – Events listing**
- Filters: county (dropdown), date (this week / this month / all).
- Event cards: poster (or placeholder if no poster), title, **county only**, date, start–end time.
- Soonest first.
- Empty state: "No events in [county] yet. Want to host the first one?" → H1.

**P3 – Event detail**
- Poster, title, county, date, start–end time, description.
- Note: "The exact location is shared by email when you register."
- Primary button: **Get details** → P4. If capacity is full: disabled "Event full".
- If the event is cancelled or expired (opened from an old link): message "This event is no longer running" + link to P2.

**P4 – Get details (registration)**
- Fields: name (nickname is fine), email.
- Privacy line: what's stored, why, that it's deleted 7 days after the event, that the host sees only the name.
- Consent checkbox (required).
- Button: **Send me the details**.

**P5 – Registration confirmed**
- "Check your email. We've sent the address and details for [event title]." Mention the spam folder.
- Link back to events.

**P6 – Stories list and story page**, **P7 – Podcasts list**, **P8 – Gallery**: simple list/grid layouts.

### Host, mobile-first

**H1 – Submit an event**
Two clearly separated sections, each with a label:

*Public details – "Visible to everyone"*
- Event title, county (dropdown), date, start time, end time, description (max 500), poster (optional), capacity (optional).

*Private details – "Only visible to Karina"*
- Exact address (with note "never shown publicly"), host name, email, phone, about your group (required, max 300), emergency contact name and phone (with note on why it's needed).

*Bottom*
- Privacy line + consent checkbox.
- Button: **Submit event for review**.
- Show inline validation errors.

**H2 – Submitted confirmation**
- "Your event has been submitted."
- What happens next:
  1. Karina reviews it (usually within 24–48 hours).
  2. If approved, it goes live.
  3. You'll receive an email with a **private link** to manage your event.
- Note: "Check your spam folder. Keep the email safe, as it's your link to edit or cancel."
- **No dashboard and no account.** Buttons: "Back to home", "Submit another event".

**H3 – Private edit page (opened from the private link)**
- Single-event page. No account, avatar or "my events" list.
- Status bar at top: e.g. **"Live · 6 registered"**.
- Tabs:
  - **Event details:** editable public and private fields, same split as H1. Date, times, county and address shown **locked with a lock icon and note** if anyone has registered. **Save changes** button with note: "Changes go live immediately. Karina will be notified."
  - **Registrations:** count + list of names only.
  - **Request contact details:** short reason field + button. Shows status (requested / shared / declined).
- **Cancel event** button, visually separated (destructive).

**H4 – Cancel confirmation dialog**
- "Cancel this event? The 6 people registered will be emailed. This can't be undone."
- Buttons: "Keep event" / "Cancel event".

**H5 – Link invalid or event ended**
- "This link is no longer active." Explain why (event ended, cancelled, or taken down).
- Link to **H6**.

**H6 – Resend my link**
- Email field → "If an event exists for this email, we've re-sent the link."

### Admin (Karina), desktop + mobile for A2/A3

**A0 – Login**
- Email + password. "Forgot password".

**A1 – Admin home**
- Two large options:
  - **Events**, with counts: "2 new requests · 3 need attention".
  - **Website content**.
- Calm, minimal.

**A2 – Events overview**
- Top-right counts: live events, new requests, attention items.
- Section **Attention** as a **vertical list** (not a carousel). Each row has a label:
  - **Needs your decision:** contact-detail requests.
  - **Update:** host edited an event, host cancelled an event. Each update has **Mark as seen**.
  - Empty state: "You're all caught up."
- Section **New requests**: cards with title, county, date, host name, submitted time ("2 days ago"), **"New" badge** if unopened.
- Section **Upcoming (live)**: soonest first, with registered count.
- Section **Past (last 7 days)**: greyed, with note "Removed automatically after 7 days".
- Filter or collapsed section for: Needs changes (waiting on host), Cancelled, Taken down.

**A3 – Request detail**
- Public details: poster, title, county, date, start–end time, description, capacity.
- Private details panel: host name, email, phone, about the group, exact address, emergency contact, submitted time.
- Actions: **Approve**, **Request changes**, **Decline**.

**A4 – Reason dialog** (used for Request changes and Decline)
- Text box: "Explain to the host…" (required).
- Preview line: "This will be emailed to [host name]."
- Buttons: Cancel / Send.

**A5 – Approved confirmation**
- "Approved. [Host name] has been emailed their private link."
- Buttons: **View live event** (opens P3), **Copy host link** (secondary, for when a host loses the email).

**A6 – Live event detail (admin)**
- All event details (read-only), registered count.
- Actions: **Take down** (with reason dialog), **Cancel event** (with confirmation, registrants emailed).
- Activity log: approved date, host edits with dates.

**A7 – Attention item detail**
- **Host edited:** before → after comparison per changed field. Buttons: "Mark as seen", "Take down".
- **Host cancelled:** event summary + "Mark as seen".
- **Contact request:** host's reason, number of registrants. Buttons: "Share contact details" / "Decline" (with reason).

**A8 – Website content**
- Page selector along the top: Homepage, Stories, Podcasts, Gallery, About.
- **Homepage:** list of editable sections (heading + text + image). Edit inline. **Save** + **Preview** buttons.
- **Stories:** list with "Add new story". Story editor: title, cover image, text.
- **Podcasts:** list with "Add new podcast". Fields: title, short description, YouTube link (show a preview once pasted).
- **Gallery:** image grid with "Upload images", delete, reorder.
- Confirmation toast after saving: "Saved. Your changes are live."

## 8. Emails (wireframe as simple text layouts)

| ID | To | Trigger | Content |
|---|---|---|---|
| E1 | Host | Submitted | Received, what happens next, typical review time |
| E2 | Host | Needs changes | Karina's reason, how to resubmit |
| E3 | Host | Declined | Kind message + Karina's reason |
| E4 | Host | Approved / live | Event is live, link to public page, **private edit link**, keep this email safe |
| E5 | Karina | New submission | Event summary + link to A3 |
| E6 | Karina | Host edited | Before → after summary + link to A7 |
| E7 | Karina | Host cancelled / contact request | Summary + link to A7 |
| E8 | Registrant | Registered | Event details incl. **exact address**, date, times |
| E9 | Registrant | Event cancelled | Event cancelled, apology |
| E10 | Host | Contact request outcome | Shared details or decline reason |

## 9. Sample content

- **Event:** "Gentle Walk & Chat", Co. Clare, Sat 14 Nov, 11:00–13:00, capacity 15.
  - Description: "A relaxed walk at an easy pace, followed by tea. All welcome, no experience needed."
  - Private: exact address "Car park, Main Street, Ennistymon", host "Mary O'Brien", mary@example.com, +353 87 000 0000, about: "Small walking group running for two years", emergency contact "Siobhán O'Brien, +353 86 000 0000".
- **Second event:** "Book Club Evening", Co. Galway, Thu 19 Nov, 19:00–21:00.
- **Registrants:** "Aoife", "Niamh K.", "Sam", "R."
- **Admin counts:** 2 new requests, 3 attention items, 5 live events.
- **Story:** "Finding my people in Leitrim."
- **Podcast:** "Episode 4: Starting small."

## 10. Out of scope (phase 1)

- Community chat or forum
- Visitor or host accounts
- Reminder emails and change-notification emails to registrants
- Recurring events (each date is submitted separately)
- Payments or ticketing
- Visual design and branding (colours, fonts, imagery) – comes after lo-fi testing

## 11. Constraints

- Custom build, hosted on Vercel with Supabase.
- Timeline: 15–20 days for design and build.
- Audience: about 500–1,000 people initially.
- After handover, Karina runs the site alone; admin documentation is provided.
- Personal data handling must follow GDPR (consent, purpose, deletion after 7 days).
