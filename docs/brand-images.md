# Photos needed for the new design

The site shows a labelled, dashed placeholder wherever a photo is still missing.
Each one says what to photograph and at what size.

## Design photos (upload these in the admin)

Admin › Website content › Homepage. A developer can also set a fallback file in
`public/images/brand/` (its `file` in `lib/brand-images.ts`), used while nothing is uploaded.

| Slot | Where to add it | What to show | Size |
| --- | --- | --- | --- |
| Hero photo 2 (`hero-circle`) | Top banner › Round photo | Close-up of two or three friends laughing over tea or coffee | 800 × 800 px, square |
| Hero photo 3 (`hero-pill`) | Top banner › Tall photo | An outdoor moment: a sea swim, a hill walk or a picnic | 600 × 900 px, portrait |
| Host photo (`host-photo`) | Invitation to host › Photo in the circle | A host welcoming people at a small meetup, smiling at the camera | 900 × 900 px, square |

## Photos you can add yourself in the admin

| Slot | Where to add it | What to show | Size |
| --- | --- | --- | --- |
| Event photos 1–3 | Admin › Website content › Homepage › Event photo 1/2/3 | A group shot from a meetup; hands around mugs, books or crafts; friends outdoors | 1200 × 900 px, landscape |
| About photos 1–3 | Admin › Website content › About › Event photo 1/2/3 | A warm group photo; people chatting at an event; a moment of welcome | 1200 × 900 px, landscape |
| Story covers | Admin › Stories (cover photo) | Optional. Without one, the story gets a tinted quote card | 1600 × 900 px |

Tips: natural light, real people (with their consent), warm and candid rather than posed.
Photos are cropped into round and arch shapes, so keep faces away from the edges.

To hide every empty placeholder (for example at launch), set `SHOW_PLACEHOLDERS = false` in `lib/brand-images.ts`.
