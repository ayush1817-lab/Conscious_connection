# Photos needed for the new design

The site shows a labelled, dashed placeholder wherever a photo is still missing.
Each one says what to photograph and at what size.

## Design photos (send these to the developer)

These are part of the design, not edited in the admin. To add one, put the file in
`public/images/brand/` and set its `file` in `lib/brand-images.ts`.

| Slot | Where it shows | What to show | Size |
| --- | --- | --- | --- |
| Hero photo 2 (`hero-circle`) | Homepage top, small circle bottom-left of the main photo | Close-up of two or three friends laughing over tea or coffee | 800 × 800 px, square |
| Hero photo 3 (`hero-pill`) | Homepage top, tilted pill top-right of the main photo | An outdoor moment: a sea swim, a hill walk or a picnic | 600 × 900 px, portrait |
| Host photo (`host-photo`) | Homepage "Want to host an event?" panel, circle | A host welcoming people at a small meetup, smiling at the camera | 900 × 900 px, square |

## Photos you can add yourself in the admin

| Slot | Where to add it | What to show | Size |
| --- | --- | --- | --- |
| Event photos 1–3 | Admin › Website content › Homepage › Event photo 1/2/3 | A group shot from a meetup; hands around mugs, books or crafts; friends outdoors | 1200 × 900 px, landscape |
| About photos 1–3 | Admin › Website content › About › Event photo 1/2/3 | A warm group photo; people chatting at an event; a moment of welcome | 1200 × 900 px, landscape |
| Story covers | Admin › Stories (cover photo) | Optional. Without one, the story gets a tinted quote card | 1600 × 900 px |

Tips: natural light, real people (with their consent), warm and candid rather than posed.
Photos are cropped into round and arch shapes, so keep faces away from the edges.

To hide every empty placeholder (for example at launch), set `SHOW_PLACEHOLDERS = false` in `lib/brand-images.ts`.
